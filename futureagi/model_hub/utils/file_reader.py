import csv
import json
import os
from io import StringIO
from typing import Any

import pandas as pd
import structlog

logger = structlog.get_logger(__name__)


class FileProcessingError(Exception):
    """Custom exception for file processing errors"""

    pass


class FileProcessor:
    # Configuration constants
    SUPPORTED_EXTENSIONS = {".csv", ".xls", ".xlsx", ".json", ".jsonl"}

    @staticmethod
    def _deduplicate_columns(columns: list[str]) -> list[str]:
        """
        Rename duplicate column names by appending _1, _2, etc.
        E.g., ["id", "name", "id"] -> ["id", "name", "id_1"]
        """
        seen: dict[str, int] = {}
        result = []
        for col in columns:
            if col in seen:
                seen[col] += 1
                result.append(f"{col}_{seen[col]}")
            else:
                seen[col] = 0
                result.append(col)
        return result

    @staticmethod
    def process_file(file_obj: Any) -> tuple[pd.DataFrame, str | None]:
        """
        Process uploaded file and return DataFrame or error message.

        Args:
            file_obj: File object to process


        Returns:
            Tuple[pd.DataFrame, Optional[str]]: (DataFrame, error_message)
            If successful, error_message will be None
            If failed, DataFrame will be None and error_message will contain the error
        """
        try:
            # Get file extension
            file_name = getattr(file_obj, "name", None)
            if not file_name:
                raise FileProcessingError("File object must have a 'name' attribute")
            file_extension = os.path.splitext(file_name.lower())[1]
            if file_extension not in FileProcessor.SUPPORTED_EXTENSIONS:
                raise FileProcessingError("Unsupported file format")

            # Process file based on extension
            data = FileProcessor._read_file(file_obj, file_extension)

            # Validate DataFrame
            error_msg = FileProcessor._validate_dataframe(data)
            if error_msg:
                raise FileProcessingError(error_msg)

            return data, None

        except FileProcessingError as e:
            logger.warning(f"File processing error: {str(e)}")
            return None, str(e)
        except Exception:
            logger.exception("Unexpected error while processing file")
            return None, "An unexpected error occurred while processing the file"

    @staticmethod
    def _read_file(file_obj: Any, file_extension: str) -> pd.DataFrame:
        """Read file based on extension and return DataFrame"""
        file_obj.seek(0)  # Reset file pointer

        if file_extension == ".csv":
            return FileProcessor._read_csv_file(file_obj)
        elif file_extension in (".xls", ".xlsx"):
            return FileProcessor._read_excel_file(file_obj)
        elif file_extension == ".json":
            return FileProcessor._read_json_file(file_obj)
        elif file_extension == ".jsonl":
            return FileProcessor._read_json_file(file_obj, lines=True)

        raise FileProcessingError("Unsupported file format")

    @staticmethod
    def _read_csv_file(file_obj: Any) -> pd.DataFrame:
        encodings = ["utf-8", "latin1", "cp1252", "iso-8859-1"]
        fallback_delimiters = [",", "\t", ";", "|"]

        for encoding in encodings:
            try:
                file_obj.seek(0)
                raw_data = file_obj.read()
                if isinstance(raw_data, bytes):
                    raw_data = raw_data.decode(encoding)

                # Normalize smart/curly quotes to straight quotes so that
                # csv.reader (which uses quotechar='"') can recognise them.
                # Without this, CSVs exported from Excel or Google Sheets that
                # use typographic quotes will have their quoted-field commas
                # treated as delimiters, leading to wrong column counts and
                # ultimately all columns being merged into one.
                raw_data = (
                    raw_data.replace("\u201c", '"')
                    .replace("\u201d", '"')
                    .replace("\u201e", '"')
                    .replace("\u201f", '"')
                )

                # Try to detect delimiter using Sniffer with large sample
                sample = raw_data[:4096]
                try:
                    dialect = csv.Sniffer().sniff(sample)
                    delimiter = dialect.delimiter
                except csv.Error:
                    delimiter = None

                # Candidate delimiters to try, prioritized
                delimiters_to_try = [delimiter] if delimiter else []
                for d in fallback_delimiters:
                    if d not in delimiters_to_try:
                        delimiters_to_try.append(d)

                # Try each delimiter until rows are consistent
                last_delimiter_rows = None
                for delim in delimiters_to_try:
                    reader = csv.reader(
                        StringIO(raw_data), delimiter=delim, quotechar='"'
                    )
                    rows = list(reader)
                    last_delimiter_rows = len(rows) if rows else 0
                    if not rows or len(rows) < 2:
                        continue
                    header = rows[0]
                    expected_cols = len(header)
                    # Check if all rows have matching number of columns
                    bad_rows = [
                        i + 2 for i, r in enumerate(rows[1:]) if len(r) != expected_cols
                    ]
                    if bad_rows:
                        # inconsistent columns, try next delimiter
                        continue
                    # Handle duplicate column names
                    header = FileProcessor._deduplicate_columns(header)
                    # All rows consistent, create DataFrame
                    df = pd.DataFrame(rows[1:], columns=header)
                    df.reset_index(drop=True, inplace=True)
                    return df

                # If no delimiter worked:
                if last_delimiter_rows == 1:
                    raise FileProcessingError(
                        "The file contains only a header row with no data."
                    )
                raise FileProcessingError(
                    "Unable to detect delimiter correctly; rows have inconsistent column counts."
                )
            except UnicodeDecodeError:
                # Try next encoding
                continue
            except FileProcessingError:
                # Re-raise file processing errors (e.g., inconsistent columns)
                raise
            except Exception as e:
                # Log and try next encoding
                logger.warning(f"Error reading CSV with encoding {encoding}: {str(e)}")
                continue

        raise FileProcessingError(
            "Unable to read CSV file with any supported encoding or delimiter."
        )

    @staticmethod
    def _read_excel_file(file_obj: Any) -> pd.DataFrame:
        """Read Excel file"""
        try:
            return pd.read_excel(file_obj)
        except Exception as e:
            logger.exception(f"Error reading Excel file: {str(e)}")
            if "Excel file format cannot be determined" in str(e):
                raise FileProcessingError("Invalid Excel file format") from e
            raise FileProcessingError(f"Error reading Excel file: {str(e)}") from e

    @staticmethod
    def _read_json_file(file_obj: Any, lines: bool = False) -> pd.DataFrame:
        """Read JSON/JSONL file"""
        try:
            return pd.read_json(file_obj, lines=lines)
        except ValueError as e:
            error_msg = str(e)

            # Check if error is due to mismatched array lengths (single object with mixed types)
            if "All arrays must be of the same length" in error_msg and not lines:
                logger.info(
                    "Detected mismatched array lengths, attempting to parse as single record"
                )
                try:
                    # Reset file pointer and parse JSON manually
                    file_obj.seek(0)
                    raw_data = file_obj.read()
                    if isinstance(raw_data, bytes):
                        raw_data = raw_data.decode("utf-8")

                    data = json.loads(raw_data)

                    # If it's a single dict (not list), treat as one row
                    # This handles JSON objects with mixed scalar/array/nested values
                    if isinstance(data, dict) and data:
                        logger.info("Treating JSON object as single record")
                        return pd.DataFrame([data])

                except Exception as parse_error:
                    logger.warning(
                        f"Failed to parse as single record: {str(parse_error)}"
                    )

            # If not the padding case or padding failed, raise original error
            logger.warning(f"Error reading JSON file: {error_msg}")
            file_type = "JSONL" if lines else "JSON"
            raise FileProcessingError(f"Invalid {file_type} format: {error_msg}") from e

    @staticmethod
    def _validate_dataframe(df: pd.DataFrame) -> str | None:
        """
        Validate DataFrame and return error message if invalid.
        Returns None if valid.
        """
        if df.empty:
            return "The file contains no data"

        return None

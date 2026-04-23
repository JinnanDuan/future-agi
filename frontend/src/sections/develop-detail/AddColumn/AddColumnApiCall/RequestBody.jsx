import {
  Box,
  FormHelperText,
  MenuItem,
  Paper,
  Popper,
  Typography,
  useTheme,
} from "@mui/material";
import _ from "lodash";
import PropTypes from "prop-types";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useController } from "react-hook-form";

const startRegex = /.*{{[^}\s]*(?!}})$/;

const RequestBody = ({
  control,
  contentFieldName,
  allColumns,
  placeholder,
  showHelper = true,
  sx = {},
}) => {
  const theme = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const quillRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const popperRef = useRef(null);

  const { field, formState } = useController({
    control,
    name: contentFieldName,
  });

  const value =
    typeof field.value === "string"
      ? field.value
      : typeof field.value === "object"
        ? JSON.stringify(field.value, null, 2)
        : "";

  const { errors } = formState;

  const errorMessage = _.get(errors, `${contentFieldName}.message`) || "";
  const isError = !!errorMessage;

  const searchText = useMemo(() => {
    const textarea = quillRef.current;
    if (!textarea) return "";
    const { selectionStart } = textarea;

    const textBeforeCursor = value.substring(0, selectionStart);
    if (!startRegex.test(textBeforeCursor)) return "";
    const lastOpenBracketIndex = textBeforeCursor.lastIndexOf("{{");

    return textBeforeCursor.substring(lastOpenBracketIndex + 2, selectionStart);
  }, [value]);

  const columnOptions = useMemo(() => {
    return allColumns.reduce((filtered, column) => {
      if (
        column?.headerName?.toLowerCase().startsWith(searchText.toLowerCase())
      ) {
        filtered.push({
          label: column.headerName,
          value: `{{${column.headerName}}}`,
        });
      }
      return filtered;
    }, []);
  }, [allColumns, searchText]);

  const onCloseDropdown = () => {
    setShowDropdown(false);
    setSelectedIndex(0);
  };

  const getCaretCoordinates = (element, position) => {
    const { offsetLeft, offsetTop } = element;
    const div = document.createElement("div");
    const style = getComputedStyle(element);

    div.style.fontSize = style.fontSize;
    div.style.fontFamily = style.fontFamily;
    div.style.padding = style.padding;
    div.style.position = "absolute";
    div.style.whiteSpace = "pre-wrap";
    div.textContent = element.value.substring(0, position);

    const span = document.createElement("span");
    span.textContent = element.value.substring(position) || ".";
    div.appendChild(span);

    document.body.appendChild(div);
    const coordinates = {
      left: offsetLeft + span.offsetLeft,
      top: offsetTop + span.offsetTop,
      height: span.offsetHeight,
    };
    document.body.removeChild(div);

    return coordinates;
  };

  const setDropDownPos = useCallback(() => {
    const textarea = quillRef.current;
    const { selectionStart } = textarea;

    const cursorCoords = getCaretCoordinates(textarea, selectionStart);

    const rect = textarea.getBoundingClientRect();

    const dropDownPos = {
      x: rect.left + cursorCoords.left,
      y: rect.top + cursorCoords.top + cursorCoords.height,
    };

    setDropdownPosition(dropDownPos);
  }, []);

  const handleChange = (content) => {
    field.onChange(content);
    const textarea = quillRef.current;
    const { selectionStart } = textarea;

    // Get text up to cursor position only
    const textBeforeCursor = content.substring(0, selectionStart);

    if (startRegex.test(textBeforeCursor) && allColumns.length > 0) {
      setDropDownPos();
      setShowDropdown(true);
    } else {
      onCloseDropdown();
    }
  };

  useEffect(() => {
    window.addEventListener("resize", setDropDownPos);
    return () => window.removeEventListener("resize", setDropDownPos);
  }, [setDropDownPos]);

  const handleVariableSelect = (variable) => {
    const textarea = quillRef.current;
    const { selectionStart } = textarea;
    const content = textarea.value;
    const textBeforeCursor = content.substring(0, selectionStart);

    // Find the last occurrence of {{ before cursor
    const lastOpenBracketIndex = textBeforeCursor.lastIndexOf("{{");

    // Create new content by replacing text between {{ and cursor with variable
    const newContent =
      content.substring(0, lastOpenBracketIndex) +
      `${variable.value}` +
      content.substring(selectionStart);
    field.onChange(newContent);
    onCloseDropdown();

    // Set cursor position after the inserted variable
    setTimeout(() => {
      const newCursorPosition = lastOpenBracketIndex + variable.value.length;
      textarea.selectionEnd = newCursorPosition;
      textarea.selectionStart = newCursorPosition;
    }, 0);
  };

  const onKeyDownInTextarea = (e) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      onCloseDropdown();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % columnOptions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : columnOptions.length - 1,
      );
    } else if (e.key === "Enter" && showDropdown) {
      e.preventDefault();
      handleVariableSelect(columnOptions[selectedIndex]);
    }
  };
  return (
    <Box
      sx={{
        paddingX: 2,
        paddingBottom: 1,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <div style={{ position: "relative" }}>
        <textarea
          onBlur={field.onBlur}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          ref={(r) => {
            quillRef.current = r;
            field.ref(r);
          }}
          placeholder={
            placeholder === "" ? "" : placeholder || "Write JSON here..."
          }
          style={{
            width: "100%",
            minHeight: "200px",
            padding: "8px",
            border: `1px solid ${theme.palette.divider}`,
            resize: "none",
            fontFamily: "inherit",
            outline: "none",
            color: theme.palette.text.primary,
            backgroundColor: theme.palette.background.default,
            verticalAlign: "top",
            borderRadius: "8px",
            ...sx,
          }}
          onKeyDown={onKeyDownInTextarea}
        />
        <Popper
          ref={popperRef}
          open={showDropdown}
          sx={{
            zIndex: 9999,
            "&:focus": { outline: "none" },
          }}
          placement="bottom-start"
          disablePortal={false}
          role="listbox"
          style={{
            position: "absolute",
            transform: `translate(${dropdownPosition.x}px, ${dropdownPosition.y}px)`,
          }}
          tabIndex={0}
        >
          <Paper
            elevation={3}
            sx={{ p: 0.5, maxHeight: 150, overflow: "auto" }}
          >
            {columnOptions.map((variable, index) => (
              <MenuItem
                key={variable.value}
                onClick={() => handleVariableSelect(variable)}
                selected={index === selectedIndex}
                sx={{
                  minWidth: 150,
                  backgroundColor:
                    index === selectedIndex ? "background.neutral" : "inherit",
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                  "&:focus": {
                    outline: "none",
                  },
                }}
              >
                {variable.label}
              </MenuItem>
            ))}
          </Paper>
        </Popper>
      </div>
      {allColumns.length > 0 && showHelper && (
        <Typography color="text.secondary" variant="subtitle2" fontWeight={400}>
          use
          <Typography component="span" color="primary">
            {" {{ "}
          </Typography>
          to access variables
        </Typography>
      )}
      {!!isError && (
        <FormHelperText sx={{ paddingLeft: 1, marginTop: 0 }} error={!!isError}>
          {errorMessage}
        </FormHelperText>
      )}
    </Box>
  );
};

RequestBody.propTypes = {
  control: PropTypes.object,
  contentFieldName: PropTypes.string,
  allColumns: PropTypes.array,
  placeholder: PropTypes.string,
  showHelper: PropTypes.bool,
  sx: PropTypes.object,
};

export default RequestBody;

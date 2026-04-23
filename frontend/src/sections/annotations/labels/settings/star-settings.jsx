import PropTypes from "prop-types";
import { Stack, TextField } from "@mui/material";
import { Controller } from "react-hook-form";

StarSettings.propTypes = {
  control: PropTypes.object.isRequired,
};

export default function StarSettings({ control }) {
  return (
    <Stack spacing={2}>
      <Controller
        name="settings.no_of_stars"
        control={control}
        rules={{
          required: "Required",
          min: { value: 1, message: "Minimum 1 star" },
          max: { value: 10, message: "Maximum 10 stars" },
        }}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Number of Stars"
            placeholder="5"
            type="number"
            size="small"
            fullWidth
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
            inputProps={{ min: 1, max: 10 }}
            onChange={(e) => field.onChange(Number(e.target.value))}
          />
        )}
      />
    </Stack>
  );
}

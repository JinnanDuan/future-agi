import { LoadingButton } from "@mui/lab";
import { Alert, Box, Typography } from "@mui/material";
import PropTypes from "prop-types";
import React from "react";
import { RHFTextField } from "src/components/hook-form";
import Iconify from "src/components/iconify";

const EditEmail = ({ errorMsg, isSubmitting }) => {
  return (
    <>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        Edit email
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", textAlign: "center" }}
        >
          Your login credentials will be sent to your email
        </Typography>
      </Box>
      <React.Fragment>
        <RHFTextField
          name="email"
          placeholder="Enter email id"
          label="Business Email"
          helperText=""
          type="text"
        />
        {!!errorMsg && (
          <Alert
            icon={
              <Iconify
                icon="fluent:warning-24-regular"
                sx={{ color: "red.500" }}
                width={20}
                height={20}
              />
            }
            severity="error"
            sx={{
              color: "red.500",
              border: "1px solid",
              borderColor: "red.200",
              backgroundColor: "red.o5",
            }}
          >
            {errorMsg}
          </Alert>
        )}
        <LoadingButton
          fullWidth
          color="primary"
          size="large"
          type="submit"
          variant="contained"
          loading={isSubmitting}
        >
          Update
        </LoadingButton>
      </React.Fragment>
    </>
  );
};

export default EditEmail;

EditEmail.propTypes = {
  errorMsg: PropTypes.string,
  isSubmitting: PropTypes.bool.isRequired,
};

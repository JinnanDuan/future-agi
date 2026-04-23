import { Stack } from "@mui/material";
import PropTypes from "prop-types";
import React from "react";
import PasswordSentLogin from "./PasswordSentView.jsx/PasswordSentLogin";
import EditEmail from "./PasswordSentView.jsx/EditEmail";
import { ShowComponent } from "src/components/show";

const PasswordSentView = ({
  email,
  setRegisterSuccess,
  editEmail,
  isSubmitting,
  errorMsg,
  password,
}) => {
  return (
    <Stack spacing={2} sx={{ mb: 3, alignItems: "center", minHeight: 350 }}>
      <ShowComponent condition={!editEmail}>
        <PasswordSentLogin
          email={email}
          setRegisterSuccess={setRegisterSuccess}
          password={password}
          errorMsg={errorMsg}
          isSubmitting={isSubmitting}
        />
      </ShowComponent>
      <ShowComponent condition={editEmail}>
        <EditEmail errorMsg={errorMsg} isSubmitting={isSubmitting} />
      </ShowComponent>
    </Stack>
  );
};

export default PasswordSentView;

PasswordSentView.propTypes = {
  email: PropTypes.string,
  editEmail: PropTypes.bool,
  setRegisterSuccess: PropTypes.func,
  isSubmitting: PropTypes.bool,
  errorMsg: PropTypes.string,
  password: PropTypes.object,
};

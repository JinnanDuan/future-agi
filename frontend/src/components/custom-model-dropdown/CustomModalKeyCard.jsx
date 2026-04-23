import { Box, Button, Typography, useTheme } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import axios, { endpoints } from "src/utils/axios";
import PropTypes from "prop-types";
import { enqueueSnackbar } from "notistack";
import { ShowComponent } from "../show";
import APIKeyReadOnlyView from "./APIKeyReadOnlyView";
import { Icon } from "@iconify/react";
import CustomModalAvatar from "./CustomModalAvatar";

const CustomModalKeyCard = ({ data, onDeleteClick }) => {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const theme = useTheme();

  const { mutate: updateCustomModel } = useMutation({
    /**
     *
     * @param {Object} d
     * @returns
     */
    mutationFn: ({ configJson, payload }) => {
      return axios.patch(endpoints.settings.customModal.editCustomModel, {
        ...payload,
        id: data.id,
        config_json: configJson,
      });
    },
    onSuccess: () => {
      enqueueSnackbar("Custom model updated successfully", {
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["model-list"] });
      queryClient.invalidateQueries({ queryKey: ["custom-models"] });
      setOpenModal(false);
    },
  });

  const onSubmit = ({ configJson, payload }) => {
    const newConfigJson = { ...configJson };
    /// if this was custom provider we need to always send customProvider true
    if (data?.configJson?.customProvider) {
      newConfigJson.customProvider = true;
    }
    updateCustomModel({
      configJson: newConfigJson,
      payload,
    });
  };

  const handleFormSubmit = (formData) => {
    let configJson;
    try {
      configJson = JSON.parse(formData?.key);
    } catch (error) {
      enqueueSnackbar("Invalid JSON", {
        variant: "error",
      });
      return;
    }
    const payload = {
      modelName: data.model_name,
      modelProvider: data.modelProvider,
      inputTokenCost: data.inputTokenCost,
      outputTokenCost: data.outputTokenCost,
      configJson,
    };
    onSubmit({ ...formData, configJson, payload });
  };

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: (theme) => theme.spacing(1),
        backgroundColor: "background.paper",
        padding: (theme) => theme.spacing(2),
        display: "flex",
        flexDirection: "column",
        gap: (theme) => theme.spacing(2),
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: (theme) => theme.spacing(1.5),
          }}
        >
          {/* Avatar Circle */}
          <CustomModalAvatar text={data?.userModelId} />

          {/* Title + Subtitle Column */}
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography
              typography="s1"
              fontWeight="fontWeightMedium"
              color="text.primary"
            >
              {data?.userModelId}
            </Typography>
          </Box>
        </Box>

        {data?.configJson ? (
          <Icon
            icon="gg-check-o"
            width={16}
            height={16}
            style={{
              color: theme.palette.green[400],
              marginRight: "2px",
              marginLeft: "0px",
            }}
          />
        ) : (
          <Button
            variant="contained"
            size="small"
            color="primary"
            sx={{
              paddingX: (theme) => theme.spacing(3),
              minWidth: "90px",
              height: (theme) => theme.spacing(38 / 8),
            }}
            onClick={() => setOpenModal(true)}
          >
            {"Add"}
          </Button>
        )}
      </Box>
      <ShowComponent
        condition={data?.configJson && Object.keys(data.configJson).length > 0}
      >
        <APIKeyReadOnlyView
          isJsonKey={true}
          showJsonField={true}
          openModal={openModal}
          setOpenModal={setOpenModal}
          keyValue={data?.configJson}
          provider={{
            ...data,
            maskedKey: data.configJson,
            logoUrl: "",
            displayName: data.userModelId,
            type: "json",
            hasKey: true,
          }}
          onSubmit={handleFormSubmit}
          onDeleteClick={onDeleteClick}
        />
      </ShowComponent>
    </Box>
  );
};

CustomModalKeyCard.propTypes = {
  key: PropTypes.any,
  data: PropTypes.object,
  onDeleteClick: PropTypes.func,
};

export default CustomModalKeyCard;

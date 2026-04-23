import {
  Box,
  Button,
  Drawer,
  IconButton,
  Typography,
  Select,
  MenuItem,
  FormHelperText,
} from "@mui/material";
import React, { useRef } from "react";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import Iconify from "src/components/iconify";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import axios, { endpoints } from "src/utils/axios";
import { enqueueSnackbar } from "src/components/snackbar";
import PreviewAddColumn from "../PreviewAddColumn";
import { LoadingButton } from "@mui/lab";
import { getConditionalNodeValidation } from "./validation";
import { RunPromptForm } from "../../RunPrompt/RunPrompt";
import { ExtractEntitiesChild } from "../ExtractEntities/ExtractEntities";
import { ExtractJsonKeyChild } from "../ExtractJsonKey/ExtractJsonKey";
import { RetrievalChild } from "../Retrieval/Retrieval";
import { ExecuteCodeChild } from "../ExecuteCode/ExecuteCode";
import { ClassificationChild } from "../Classification/Classification";
import { AddColumnApiCallChild } from "../AddColumnApiCall/AddColumnApiCall";
import ConditionalInput from "./ConditionalInput";
import { getRandomId } from "src/utils/utils";
import { FormSearchSelectFieldControl } from "src/components/FromSearchSelectField";
import FormTextFieldV2 from "src/components/FormTextField/FormTextFieldV2";
import { useConditionalNodeStore } from "../../states";
import { useDevelopDetailContext } from "../../Context/DevelopDetailContext";
import { useDatasetColumnConfig } from "src/api/develop/develop-detail";
import PropTypes from "prop-types";

const COLUMN_TYPE_OPTIONS = [
  { label: "Run Prompt", value: "run_prompt" },
  { label: "Retrieval", value: "retrieval" },
  { label: "Extract Entities", value: "extract_entities" },
  { label: "Extract JSON Key", value: "extract_json" },
  { label: "Execute Custom Code", value: "extract_code" },
  { label: "Classification", value: "classification" },
  { label: "API Calls", value: "api_call" },
];

const FORM_COMPONENTS = {
  run_prompt: RunPromptForm,
  retrieval: RetrievalChild,
  extract_entities: ExtractEntitiesChild,
  extract_json: ExtractJsonKeyChild,
  extract_code: ExecuteCodeChild,
  classification: ClassificationChild,
  api_call: AddColumnApiCallChild,
};

const defaultValues = {
  new_column_name: "",
  type: "conditional",
  config: [
    {
      branch_type: "if",
      condition: "",
      branch_node_config: {
        type: "",
        config: {
          column_id: "",
          instruction: "",
          language_model_id: "",
          columnName: "",
          url: "",
          method: "POST",
          params: {},
          headers: {},
          body: "",
          outputType: "",
          concurrency: "",
          jsonKey: "",
          code: `# Function name should be main only. You can access any column of the row using the kwargs.
def main(**kwargs):
    return kwargs.get("column_name")
`,
          newColumnName: "",
          labels: [],
          subType: "",
          apiKey: "",
          indexName: "", // For Pinecone
          namespace: "", // For Pinecone
          topK: "", // Common across retrieval types
          queryKey: "", // For Pinecone
          embeddingConfig: { model: "", type: "" },
          collectionName: "", // For Qdrant and Weaviate
          searchType: "", // For Weaviate
          key: "",
          vectorLength: "",
          name: "",
          model: "",
          outputFormat: "string",
          messages: [
            {
              id: getRandomId(),
              role: "user",
              content: "",
            },
          ],
          responseFormat: null,
          temperature: 0.5,
          topP: 1,
          maxTokens: 4085,
          presencePenalty: 1,
          frequencyPenalty: 1,
          toolChoice: "none",
          tools: [],
          // runType: "",
        },
      },
    },
  ],
};

const transformCondition = (condition, allColumns) => {
  let transformedCondition = condition;
  allColumns.forEach(({ headerName, field }) => {
    const pattern = new RegExp(`{{${headerName}}}`, "g");
    if (transformedCondition && transformedCondition.length) {
      transformedCondition = transformedCondition.replace(
        pattern,
        `{{${field}}}`,
      );
    }
  });
  return transformedCondition;
};

const ConditionalNodeChild = ({ editId }) => {
  const { refreshGrid } = useDevelopDetailContext();
  // Using individual stores
  const { setOpenConditionalNode } = useConditionalNodeStore();

  const onClose = () => {
    setOpenConditionalNode(false);
  };
  const [editingIndex, setEditingIndex] = useState(null);
  const [selectedFormType, setSelectedFormType] = useState(null);
  const [selectedBranchIndex, setSelectedBranchIndex] = useState(null);
  const [, setType] = useState(null);
  const [isConfirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const formRef = useRef(null);

  const { dataset } = useParams();

  const allColumns = useDatasetColumnConfig(dataset);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    setError,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues,
    resolver: zodResolver(getConditionalNodeValidation(allColumns)),
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "config",
  });

  const handleDelete = (index) => {
    remove(index);
    enqueueSnackbar("Branch deleted successfully", { variant: "success" });
  };

  const handleEdit = (index) => {
    const currentConfig = getValues(`config.${index}`);
    if (currentConfig.branch_node_config.type) {
      setEditingIndex(index);
      setSelectedFormType(currentConfig.branch_node_config.type);
      setSelectedBranchIndex(index);
    }
  };

  const handleColumnTypeChange = (event, index) => {
    const value = event.target.value;
    const currentConfig = getValues(`config[${index}]`);
    const updatedConfig = {
      ...fields[index],
      branch_type: currentConfig.branch_type,
      condition: currentConfig.condition,
      branch_node_config: {
        type: value,
        config: {
          column_id: "",
          instruction: "",
          language_model_id: "",
          columnName: "",
          url: "",
          method: "POST",
          params: {},
          headers: {},
          body: "",
          outputType: "string",
          concurrency: "",
          jsonKey: "",
          newColumnName: "",
          code: `# Function name should be main only. You can access any column of the row using the kwargs.
def main(**kwargs):
    return kwargs.get("column_name")
`,
          labels: [],
          subType: "",
          columnId: "",
          apiKey: "",
          indexName: "",
          namespace: "",
          topK: "",
          queryKey: "",
          embeddingConfig: { model: "", type: "" },
          collectionName: "",
          searchType: "",
          key: "",
          vectorLength: "",
          name: "",
          model: "",
          outputFormat: "string",
          messages: [
            {
              id: getRandomId(),
              role: "user",
              content: "",
            },
          ],
          responseFormat: null,
          temperature: 0.5,
          topP: 1,
          maxTokens: 4085,
          presencePenalty: 1,
          frequencyPenalty: 1,
          toolChoice: "none",
          tools: [],
        },
      },
    };

    update(index, updatedConfig);
    setValue(`config.${index}.branch_node_config.type`, value);
    setSelectedFormType(value);
    setSelectedBranchIndex(index);
  };

  const handleFormClose = () => {
    setSelectedFormType(null);
    setSelectedBranchIndex(null);
    setEditingIndex(null);
  };
  const handleBranchTypeChange = (event, index) => {
    const value = event.target.value;
    const currentConfig = getValues(`config[${index}]`);

    update(index, {
      ...currentConfig,
      branch_type: value,
      condition: value === "else" ? "" : currentConfig.condition,
    });
  };
  const handleAddBranch = () => {
    const hasElse = fields.some((field) => field.branch_type === "else");

    if (hasElse) {
      enqueueSnackbar("Cannot add more branches after else", {
        variant: "warning",
      });
      return;
    }
    append({
      branch_type: fields.length === 0 ? "if" : "elif",
      condition: "",
      branch_node_config: {
        type: "",
        config: {
          column_id: "",
          instruction: "",
          language_model_id: "",
          columnName: "",
          url: "",
          method: "POST",
          params: {},
          headers: {},
          body: "",
          outputType: "string",
          concurrency: "",
          jsonKey: "",
          newColumnName: "",
          code: `# Function name should be main only. You can access any column of the row using the kwargs.
def main(**kwargs):
    return kwargs.get("column_name")
`,
          labels: [],
          subType: "",
          columnId: "",
          apiKey: "",
          indexName: "", // For Pinecone
          namespace: "", // For Pinecone
          topK: "", // Common across retrieval types
          queryKey: "", // For Pinecone
          embeddingConfig: { model: "", type: "" },
          collectionName: "", // For Qdrant and Weaviate
          searchType: "", // For Weaviate
          key: "",
          vectorLength: "",
          name: "",
          model: "",
          outputFormat: "string",
          messages: [
            {
              id: getRandomId(),
              role: "user",
              content: "",
            },
          ],
          responseFormat: null,
          temperature: 0.5,
          topP: 1,
          maxTokens: 4085,
          presencePenalty: 1,
          frequencyPenalty: 1,
          toolChoice: "none",
          tools: [], // runType: ""
        },
      },
    });
  };

  const { mutate: addColumn, isPending: isSubmitting } = useMutation({
    mutationFn: (data) =>
      axios.post(endpoints.develop.addColumns.conditionalnode(dataset), data),
    onSuccess: () => {
      enqueueSnackbar("Conditional column created successfully", {
        variant: "success",
      });
      refreshGrid(null, true);
      onClose();
    },
  });

  const {
    data: previewData,
    isSuccess,
    mutate: preview,
    isPending: isPreviewPending,
  } = useMutation({
    mutationFn: (data) => {
      const transformedData = {
        ...data,
        config: data.config.map((branch) => ({
          ...branch,
          condition: transformCondition(branch.condition, allColumns),
        })),
      };
      return axios.post(
        endpoints.develop.addColumns.preview(dataset, "conditional"),
        transformedData,
      );
    },
  });

  const handleFormSubmit = (formData) => {
    const currentConfig = getValues(`config[${selectedBranchIndex}]`);
    setType(formData.type);
    let updateConfig = {};
    switch (formData.type) {
      case "api_call":
        updateConfig = {
          ...currentConfig,
          branch_node_config: {
            ...currentConfig.branch_node_config,
            config: {
              ...formData,
              // column_id:formData.columnId,
              url: formData.config.url,
              method: formData.config.method,
              params: formData.config.params,
              headers: formData.config.headers,
              body: formData.config.body,
              outputType: formData.config.outputType,
              concurrency: formData.concurrency,
              columnName: formData.columnName,
            },
          },
        };
        break;
      case "run_prompt":
        updateConfig = {
          ...currentConfig,
          branch_node_config: {
            ...currentConfig.branch_node_config,
            config: {
              ...formData,
              name: formData.name,
              model: formData.config.model,
              outputFormat: formData.config.outputFormat,
              concurrency: formData.config.concurrency,
              messages: formData.config.messages,
              responseFormat: formData.config.responseFormat,
              temperature: formData.config.temperature,
              topP: formData.config.topP,
              maxTokens: formData.config.maxTokens,
              presencePenalty: formData.config.presencePenalty,
              frequencyPenalty: formData.config.frequencyPenalty,
              toolChoice:
                formData.config.toolChoice === "none"
                  ? undefined
                  : formData.config.toolChoice,
              tools: formData.config.tools || [],
              // runType  : formData.config.runType,
            },
          },
        };
        break;
      case "classification":
        updateConfig = {
          ...currentConfig,
          branch_node_config: {
            ...currentConfig.branch_node_config,
            config: {
              ...formData,
              column_id: formData.columnId,
              language_model_id: formData.languageModelId,
              concurrency: formData.concurrency,
              labels: formData.labels,
              newColumnName: formData.newColumnName,
            },
          },
        };
        break;
      case "retrieval":
        updateConfig = {
          ...currentConfig,
          branch_node_config: {
            ...currentConfig.branch_node_config,
            config: {
              ...formData,
              columnId: formData.columnId,
              apiKey: formData.apiKey,
              indexName: formData.indexName,
              namespace: formData.namespace,
              topK: formData.topK,
              queryKey: formData.queryKey,
              embeddingConfig: formData.embeddingConfig,
              concurrency: formData.concurrency,
              url: formData.url,
              collectionName: formData.collectionName,
              searchType: formData.searchType,
              key: formData.key,
              vectorLength: formData.vectorLength,
            },
          },
        };
        break;
      case "extract_entities":
        updateConfig = {
          ...currentConfig,
          branch_node_config: {
            ...currentConfig.branch_node_config,
            config: {
              ...formData,
              column_id: formData.columnId,
              language_model_id: formData.languageModelId,
              concurrency: formData.concurrency,
              instruction: formData.instruction,
              newColumnName: formData.newColumnName,
            },
          },
        };
        break;
      case "extract_json":
        updateConfig = {
          ...currentConfig,
          branch_node_config: {
            ...currentConfig.branch_node_config,
            config: {
              ...formData,
              column_id: formData.columnId,
              jsonKey: formData.jsonKey,
              concurrency: formData.concurrency,
              newColumnName: formData.newColumnName,
            },
          },
        };
        break;
      case "extract_code":
        updateConfig = {
          ...currentConfig,
          branch_node_config: {
            ...currentConfig.branch_node_config,
            config: {
              ...formData,
              code: formData.code,
              concurrency: formData.concurrency,
              newColumnName: formData.newColumnName,
            },
          },
        };
        break;
      case "custom_code":
    }
    update(selectedBranchIndex, updateConfig);
    handleFormClose();
    enqueueSnackbar("Branch updated successfully", { variant: "success" });
  };

  const handleCloseDirty = () => {
    if (formRef.current?.isDirty) {
      setConfirmationModalOpen(true);
    } else {
      handleFormClose();
    }
  };

  const renderFormDrawer = () => {
    if (!selectedFormType) return null;

    const FormComponent = FORM_COMPONENTS[selectedFormType];
    if (!FormComponent) return null;
    const branchData = fields[selectedBranchIndex]?.branch_node_config?.config;
    return (
      <Drawer
        anchor="right"
        open={Boolean(selectedFormType)}
        onClose={handleCloseDirty}
        PaperProps={{
          sx: {
            width: "550px",
            height: "100vh",
            position: "fixed",
            zIndex: 9999,
            borderRadius: "10px",
            backgroundColor: "divider",
          },
        }}
        ModalProps={{
          BackdropProps: {
            style: { backgroundColor: "transparent" },
          },
        }}
      >
        <FormComponent
          open={Boolean(selectedFormType)}
          onClose={handleFormClose}
          initialData={branchData}
          onFormSubmit={handleFormSubmit}
          isConfirmationModalOpen={isConfirmationModalOpen}
          setConfirmationModalOpen={setConfirmationModalOpen}
          ref={formRef}
        />
      </Drawer>
    );
  };

  const handleCreateColumn = handleSubmit(
    (formValues) => {
      const transformCondition = (condition, allColumns) => {
        let transformedCondition = condition;
        allColumns.forEach(({ headerName, field }) => {
          const pattern = new RegExp(`{{${headerName}}}`, "g");
          if (transformedCondition && transformedCondition.length) {
            transformedCondition = transformedCondition.replace(
              pattern,
              `{{${field}}}`,
            );
          }
        });
        return transformedCondition;
      };

      const formattedData = {
        new_column_name: formValues.new_column_name,
        config: [],
      };
      const currentConfig = getValues(`config`);
      currentConfig.map((data) => {
        const body = data.branch_node_config.config.body;
        switch (data.branch_node_config.type) {
          case "api_call":
            {
              const configData = {
                branch_type: data.branch_type,
                condition: transformCondition(data.condition, allColumns),
                branch_node_config: {
                  type: data.branch_node_config.type,
                  config: {
                    url: data.branch_node_config.config.url,
                    method: data.branch_node_config.config.method,
                    params: data.branch_node_config.config.params,
                    headers: data.branch_node_config.config.headers,
                    body: body.length ? JSON.parse(body) : {},
                    column_name: data.branch_node_config.config.columnName,
                    output_type: data.branch_node_config.config.outputType,
                    concurrency: data.branch_node_config.config.concurrency,
                  },
                },
              };
              formattedData.config.push(configData);
            }
            break;

          case "run_prompt":
            {
              const configData = {
                branch_type: data.branch_type,
                condition: transformCondition(data.condition, allColumns),
                branch_node_config: {
                  type: data.branch_node_config.config.type,
                  config: {
                    name: data.branch_node_config.config.config.name,
                    model: data.branch_node_config.config.config.model,
                    output_format:
                      data.branch_node_config.config.config.outputFormat,
                    concurrency:
                      data.branch_node_config.config.config.concurrency,
                    messages: data.branch_node_config.config.config.messages,
                    response_format:
                      data.branch_node_config.config.config.responseFormat,
                    temperature:
                      data.branch_node_config.config.config.temperature,
                    top_p: data.branch_node_config.config.config.topP,
                    max_tokens: data.branch_node_config.config.config.maxTokens,
                    presence_penalty:
                      data.branch_node_config.config.config.presencePenalty,
                    frequency_penalty:
                      data.branch_node_config.config.config.frequencyPenalty,
                    tool_choice:
                      data.branch_node_config.config.config.toolChoice ===
                      "none"
                        ? undefined
                        : data.branch_node_config.config.config.toolChoice,
                    tools: data.branch_node_config.config.config.tools || [],
                    // runType: branch.branch_node_config.config.runType,
                  },
                },
              };
              formattedData.config.push(configData);
            }
            break;

          case "retrieval":
            {
              const configData = {
                branch_type: data.branch_type,
                condition: transformCondition(data.condition, allColumns),
                branch_node_config: {
                  type: data.branch_node_config.config.type,
                  config: {
                    column_id: data.branch_node_config.config.columnId,
                    api_key: data.branch_node_config.config.apiKey,
                    index_name: data.branch_node_config.config.indexName,
                    namespace: data.branch_node_config.config.namespace,
                    top_k: data.branch_node_config.config.topK,
                    query_key: data.branch_node_config.config.queryKey,
                    embedding_config:
                      data.branch_node_config.config.embeddingConfig,
                    concurrency: data.branch_node_config.config.concurrency,
                    url: data.branch_node_config.config.url,
                    collection_name:
                      data.branch_node_config.config.collectionName,
                    search_type: data.branch_node_config.config.searchType,
                    key: data.branch_node_config.config.key,
                    vector_length: data.branch_node_config.config.vectorLength,
                  },
                },
              };
              formattedData.config.push(configData);
            }
            break;

          case "extract_entities":
            {
              const configData = {
                branch_type: data.branch_type,
                condition: transformCondition(data.condition, allColumns),
                branch_node_config: {
                  type: data.branch_node_config.config.type,
                  config: {
                    column_id: data.branch_node_config.config.column_id,
                    instruction: data.branch_node_config.config.instruction,
                    language_model_id:
                      data.branch_node_config.config.language_model_id,
                    new_column_name:
                      data.branch_node_config.config.newColumnName,
                    concurrency: data.branch_node_config.config.concurrency,
                  },
                },
              };
              formattedData.config.push(configData);
            }

            break;
          case "extract_json":
            {
              const configData = {
                branch_type: data.branch_type,
                condition: transformCondition(data.condition, allColumns),
                branch_node_config: {
                  type: data.branch_node_config.config.type,
                  config: {
                    column_id: data.branch_node_config.config.column_id,
                    json_key: data.branch_node_config.config.jsonKey,
                    new_column_name:
                      data.branch_node_config.config.newColumnName,
                    concurrency: data.branch_node_config.config.concurrency,
                  },
                },
              };
              formattedData.config.push(configData);
            }
            break;
          case "extract_code":
            {
              const configData = {
                branch_type: data.branch_type,
                condition: transformCondition(data.condition, allColumns),
                branch_node_config: {
                  type: data.branch_node_config.config.type,
                  config: {
                    code: data.branch_node_config.config.code,
                    new_column_name:
                      data.branch_node_config.config.newColumnName,
                    concurrency: data.branch_node_config.config.concurrency,
                  },
                },
              };
              formattedData.config.push(configData);
            }
            break;
          case "classification": {
            const configData = {
              branch_type: data.branch_type,
              condition: transformCondition(data.condition, allColumns),
              branch_node_config: {
                type: data.branch_node_config.config.type,
                config: {
                  column_id: data.branch_node_config.config.column_id,
                  labels: data.branch_node_config.config.labels.map((item) => {
                    return item.value;
                  }),
                  new_column_name: data.branch_node_config.config.newColumnName,
                  concurrency: data.branch_node_config.config.concurrency,
                  language_model_id:
                    data.branch_node_config.config.language_model_id,
                },
              },
            };

            formattedData.config.push(configData);
          }
        }
      });

      addColumn(formattedData);
    },
    (errors) => {
      if (
        errors?.config[0]?.branch_node_config?.config &&
        !errors?.config[0]?.branch_node_config?.type
      ) {
        setError("config.0.branch_node_config.type", {
          type: "custom",
          message: "Internal form fields are required",
        });
      }
    },
  );
  const errorMessage = errors?.config?.root?.message;

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Box
        sx={{
          display: "flex",
          wordWrap: "break-word",
          overflowY: "auto",
          height: "90vh",
        }}
      >
        <PreviewAddColumn open={isSuccess} previewData={previewData} />
      </Box>

      <Box
        sx={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          height: "100%",
          width: "550px",
        }}
        component="form"
        // onSubmit={handleCreateColumn}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography fontWeight={700} color="text.secondary">
            {editId ? "Edit Conditional Node" : "Conditional Node"}
          </Typography>
          <IconButton
            onClick={() => {
              reset();
              onClose();
            }}
            size="small"
          >
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Box>
        <Box
          sx={{
            gap: 2,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "auto",
            paddingTop: 1,
          }}
        >
          <FormTextFieldV2
            label="Name"
            size="small"
            control={control}
            placeholder="Enter column name"
            fieldName="new_column_name"
          />

          {fields.map((field, index) => (
            <Box
              key={field.id}
              sx={{
                backgroundColor: "background.paper",
                border: "1px solid var(--border-default)",
                borderRadius: "8px",
                marginBottom: "16px",
                width: "100%",
                padding: "20px",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                {index === 0 ? (
                  <Typography fontSize="14px" fontWeight={600}>
                    If
                  </Typography>
                ) : (
                  <Select
                    size="small"
                    value={field.branch_type}
                    onChange={(e) => handleBranchTypeChange(e, index)}
                    sx={{ minWidth: 100 }}
                  >
                    <MenuItem value="elif">
                      <strong>Elif</strong>
                    </MenuItem>
                    <MenuItem value="else">
                      <strong>Else</strong>
                    </MenuItem>
                  </Select>
                )}
                <Box sx={{ display: "flex", gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(index)}
                    color="default"
                    disabled={
                      (editingIndex !== null && editingIndex !== index) ||
                      !fields[index].branch_node_config.type
                    }
                  >
                    <Iconify icon="solar:pen-bold" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(index)}
                    disabled={editingIndex !== null && editingIndex !== index}
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </Box>
              </Box>

              {field.branch_type !== "else" && (
                <ConditionalInput
                  control={control}
                  fieldName={`config.${index}.condition`}
                  allColumns={allColumns}
                />
              )}
              <Box sx={{ mt: 2 }}>
                <FormSearchSelectFieldControl
                  fullWidth
                  label="Select Column Type"
                  size="small"
                  control={control}
                  fieldName={`config.${index}.branch_node_config.type`}
                  options={COLUMN_TYPE_OPTIONS}
                  onChange={(event) => handleColumnTypeChange(event, index)}
                  disabled={editingIndex !== null && editingIndex !== index}
                />
              </Box>
              {renderFormDrawer()}
            </Box>
          ))}

          <Button
            fullWidth
            variant="outlined"
            onClick={handleAddBranch}
            disabled={editingIndex !== null}
          >
            Add Branch
          </Button>
          {fields.length === 0
            ? errorMessage && (
                <FormHelperText error={true}>{errorMessage}</FormHelperText>
              )
            : null}
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <LoadingButton
            onClick={handleSubmit(preview)}
            variant="outlined"
            fullWidth
            size="small"
            loading={isPreviewPending}
          >
            Test
          </LoadingButton>
          <LoadingButton
            // type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="small"
            loading={isSubmitting}
            onClick={handleCreateColumn}
          >
            {editId ? "Update Column" : "Create New Column"}
          </LoadingButton>
        </Box>
      </Box>
    </Box>
  );
};

ConditionalNodeChild.propTypes = {
  editId: PropTypes.string,
};

const ConditionalNode = () => {
  // Using individual stores
  const { openConditionalNode, setOpenConditionalNode } =
    useConditionalNodeStore();

  const onClose = () => {
    setOpenConditionalNode(false);
  };

  const editId = openConditionalNode?.editId;

  return (
    <Drawer
      anchor="right"
      open={openConditionalNode}
      onClose={onClose}
      variant="persistent"
      PaperProps={{
        sx: {
          height: "100vh",
          position: "fixed",
          zIndex: 2,
          boxShadow: "-10px 0px 100px #00000035",
          borderRadius: "10px",
          backgroundColor: "background.paper",
        },
      }}
      ModalProps={{
        BackdropProps: {
          style: { backgroundColor: "transparent" },
        },
      }}
    >
      <ConditionalNodeChild editId={editId} />
    </Drawer>
  );
};

ConditionalNode.propTypes = {};

export default ConditionalNode;

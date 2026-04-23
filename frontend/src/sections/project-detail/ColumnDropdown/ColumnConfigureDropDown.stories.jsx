import React, { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import Button from "@mui/material/Button";

import ColumnConfigureDropDown from "./ColumnConfigureDropDown.jsx";
import logger from "src/utils/logger.js";

const meta = {
  component: ColumnConfigureDropDown,
  title: "UI Components/ColumnConfigureDropDown",
};

export default meta;

const Template = (args) => {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <MemoryRouter>
      <Button onClick={handleClick}>Open Dropdown</Button>
      <ColumnConfigureDropDown
        {...args}
        open={open}
        onClose={handleClose}
        anchorEl={anchorEl}
        columns={[
          { id: 1, name: "Column 1", isVisible: true, groupBy: "Group 1" },
          { id: 2, name: "Column 2", isVisible: false, groupBy: "Group 1" },
          { id: 3, name: "Column 3", isVisible: true, groupBy: "Group 2" },
          { id: 4, name: "Column 4", isVisible: false, groupBy: "Group 2" },
        ]}
        setColumns={(columns) => logger.debug("setColumns called", columns)}
        defaultGrouping="Default Grouping"
      />
    </MemoryRouter>
  );
};

export const Default = Template.bind({});
Default.args = {};

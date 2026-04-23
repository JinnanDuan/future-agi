const path = require('path');

const frontendBin = (tool) =>
  path.join('frontend', 'node_modules', '.bin', tool);

module.exports = {
  'frontend/src/**/*.{js,jsx,ts,tsx}': (files) => {
    const args = files.map((f) => `"${f}"`).join(' ');
    return [
      `${frontendBin('eslint')} --fix ${args}`,
      `${frontendBin('prettier')} --write ${args}`,
    ];
  },
  'frontend/src/**/*.{json,css,md}': (files) => {
    const args = files.map((f) => `"${f}"`).join(' ');
    return `${frontendBin('prettier')} --write ${args}`;
  },
};

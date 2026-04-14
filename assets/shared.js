// ============================================================================
// SHARED UTILITIES - Common functions to avoid circular dependencies
// ============================================================================

export function showUserError(message) {
  // Try to show error in validation messages area, fallback to alert
  const validationContainer = document.querySelector('#validationContainer');
  if (validationContainer) {
    validationContainer.innerHTML = `
      <div class="validation-message error">
        <strong>Error:</strong> ${message}
      </div>
    `;
    validationContainer.style.display = 'block';
  } else {
    alert(message);
  }
}

export function handleCalculationError(operation, error, fallback = null) {
  console.error(`Calculation error in ${operation}:`, error);
  // Show user-friendly error message
  const errorMsg = `Calculation error: ${operation} failed. Please check your inputs.`;
  showUserError(errorMsg);
  return fallback;
}


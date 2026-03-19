// Simple modal check script
// This will verify the core functionality without complex dependencies

console.log('Starting modal check...');

// Test 1: Check if SimpleModal exists
try {
    const { createSimpleModal, showSimpleNotification, showSimpleConfirmation } = await import('./components/SimpleModal.js');
    console.log('✓ SimpleModal module exists');
    console.log('  - createSimpleModal function:', typeof createSimpleModal);
    console.log('  - showSimpleNotification function:', typeof showSimpleNotification);
    console.log('  - showSimpleConfirmation function:', typeof showSimpleConfirmation);
} catch (e) {
    console.error('✗ SimpleModal module not found:', e.message);
}

// Test 2: Check if UIHelpers exists
try {
    const { showDeleteConfirmation, openScenarioModal } = await import('./components/UIHelpers.js');
    console.log('✓ UIHelpers module exists');
    console.log('  - showDeleteConfirmation function:', typeof showDeleteConfirmation);
    console.log('  - openScenarioModal function:', typeof openScenarioModal);
} catch (e) {
    console.error('✗ UIHelpers module not found:', e.message);
}

// Test 3: Check if scenario service exists
try {
    const { saveScenario, loadScenario, deleteScenario } = await import('./services/scenarioService.js');
    console.log('✓ Scenario service module exists');
    console.log('  - saveScenario function:', typeof saveScenario);
    console.log('  - loadScenario function:', typeof loadScenario);
    console.log('  - deleteScenario function:', typeof deleteScenario);
} catch (e) {
    console.error('✗ Scenario service module not found:', e.message);
}

// Test 4: Check if required functions are defined
try {
    const { createSimpleModal } = await import('./components/SimpleModal.js');
    const modal = createSimpleModal({
        title: 'Test',
        content: 'Test',
        size: 'medium'
    });
    console.log('✓ createSimpleModal function works');
    modal.remove();
} catch (e) {
    console.error('✗ createSimpleModal function failed:', e.message);
}

console.log('Modal check completed!');
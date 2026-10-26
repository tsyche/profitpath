// Table focus management
let focusState = {
  row: -1,
  col: -1,
  editing: null as Element | null
};

export function captureTableFocus(tableId: string) {
  const table = document.getElementById(tableId);
  if (!table) return null;

  const activeElement = document.activeElement;
  if (activeElement && typeof table.contains === 'function' && table.contains(activeElement)) {
    const cell = activeElement.closest('td, th');
    if (cell) {
      const row = cell.parentElement;
      if (!(row instanceof HTMLTableRowElement)) return null;
      focusState = {
        row: Array.from(table.querySelectorAll('tr')).indexOf(row),
        col: Array.from(row.cells).indexOf(cell as HTMLTableCellElement),
        editing: activeElement.tagName === 'INPUT' ? activeElement : null
      };
      return focusState;
    }
  }
  return null;
}

export function restoreTableFocus(tableId: string) {
  const table = document.getElementById(tableId);
  if (!table || focusState.row < 0) return;

  const rows = table.querySelectorAll('tr');
  if (focusState.row < rows.length) {
    const cells = rows[focusState.row].cells;
    if (focusState.col < cells.length) {
      const cell = cells[focusState.col];
      cell.focus();

      if (focusState.editing) {
        const input = cell.querySelector('input');
        if (input) {
          input.focus();
          input.select();
        }
      }
    }
  }
}

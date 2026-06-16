// Chart utilities
export function lazyLoadChart(chartId, data, _options = {}) {
  const canvas = document.getElementById(chartId);
  if (!canvas) return null;

  // Simple chart rendering (placeholder for Chart.js or similar)
  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = canvas.offsetHeight;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Simple bar chart implementation
  if (data && data.length > 0) {
    const margin = 40;
    const chartWidth = width - margin * 2;
    const chartHeight = height - margin * 2;
    const barWidth = chartWidth / data.length;
    const maxValue = Math.max(...data.map(d => d.value || 0));

    data.forEach((item, index) => {
      const barHeight = (item.value / maxValue) * chartHeight;
      const x = margin + index * barWidth;
      const y = height - margin - barHeight;

      ctx.fillStyle = item.color || '#3b82f6';
      ctx.fillRect(x, y, barWidth - 2, barHeight);

      // Label
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.label || '', x + barWidth / 2, height - 20);
    });
  }

  return canvas;
}

export function setupChartEventListeners(chartId, callbacks = {}) {
  const canvas = document.getElementById(chartId);
  if (!canvas) return;

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (callbacks.onClick) {
      callbacks.onClick({ x, y, target: canvas });
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (callbacks.onHover) {
      callbacks.onHover({ x, y, target: canvas });
    }
  });
}

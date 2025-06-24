// Sample data for CiliaHub table (replace with real data if available)
const ciliahubData = [
  {
    gene: "BBS1",
    ensemblId: "ENSG00000166266",
    description: "Bardet-Biedl syndrome 1 protein",
    synonym: "BBS2L2",
    reference: "Pir et al., 2024 (DOI: 10.1093/nar/gkad1044)",
    localization: "Axoneme"
  },
  {
    gene: "IFT88",
    ensemblId: "ENSG00000032742",
    description: "Intraflagellar transport 88",
    synonym: "TTC10",
    reference: "CiliaMiner, 2023",
    localization: "Basal Body"
  },
  {
    gene: "CEP290",
    ensemblId: "ENSG00000198707",
    description: "Centrosomal protein 290",
    synonym: "NPHP6",
    reference: "CilioGenics, 2022",
    localization: "Transition Zone"
  },
  {
    gene: "DYNC2H1",
    ensemblId: "ENSG00000187231",
    description: "Dynein cytoplasmic 2 heavy chain 1",
    synonym: "DHC2",
    reference: "Pir et al., 2024 (DOI: 10.1093/nar/gkad1044)",
    localization: "Axoneme"
  }
];

// Initialize CiliaHub table on page load
document.addEventListener('DOMContentLoaded', () => {
  populateCiliahubTable();
  setupEventListeners();
});

// Populate table with data
function populateCiliahubTable() {
  const tbody = document.querySelector('.ciliahub-table tbody');
  tbody.innerHTML = ''; // Clear existing rows
  ciliahubData.forEach(item => {
    const row = document.createElement('tr');
    // Add class based on localization for color coding
    const localizationClass = item.localization.toLowerCase().replace(/\s+/g, '-');
    row.classList.add(localizationClass);
    row.innerHTML = `
    <td>${item.gene}</td>
      <td>${item.ensemblId}</td>
      <td>${item.description}</td>
      <td>${item.synonym}</td>
      <td class="reference" data-tooltip="${item.reference}">${item.reference}</td>
      <td>${item.localization}</td>
      `;
    tbody.appendChild(row);
  });
}

// Set up event listeners for search, filter, reset, and download
function setupEventListeners() {
  // Search functionality
  document.getElementById('ciliahub-search').addEventListener('input', filterTable);
  
  // Filter by localization
  document.getElementById('ciliahub-filter').addEventListener('change', filterTable);
  
  // Reset search and filter
  document.getElementById('ciliahub-reset').addEventListener('click', () => {
    document.getElementById('ciliahub-search').value = '';
    document.getElementById('ciliahub-filter').value = '';
    filterTable(); // Re-run filter to show all rows
  });
  
  // Download table as CSV
  document.getElementById('download-ciliahub').addEventListener('click', downloadCSV);
}

// Filter table based on search and localization
function filterTable() {
  const searchTerm = document.getElementById('ciliahub-search').value.toLowerCase();
  const filterValue = document.getElementById('ciliahub-filter').value;
  const rows = document.querySelectorAll('.ciliahub-table tbody tr');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    const matchesSearch = text.includes(searchTerm);
    const matchesFilter = filterValue === '' || row.classList.contains(filterValue);
    row.style.display = matchesSearch && matchesFilter ? '' : 'none';
  });
}

// Download table data as CSV
function downloadCSV() {
  const headers = ['Gene', 'Ensembl ID', 'Gene Description', 'Synonym', 'Reference', 'Ciliary Localization'];
  const rows = ciliahubData.map(item => [
    `"${item.gene}"`,
    `"${item.ensemblId}"`,
    `"${item.description}"`,
    `"${item.synonym}"`,
    `"${item.reference}"`,
    `"${item.localization}"`
  ]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'ciliahub_data.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
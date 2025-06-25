const ciliahubData = [
  { gene: "ABCC4", ensemblId: "ENSG00000125257", description: "ATP binding cassette subfamily C member 4 (PEL blood group)", synonym: "MRP4|EST170205|MOAT-B|MOATB", reference: "25173977;30685088;32228435", localization: "Membrane" },
  { gene: "ABLIM1", ensemblId: "ENSG00000099204", description: "actin binding LIM protein 1", synonym: "abLIM|limatin", reference: "22684256;20487527", localization: "Actin Cytoskeleton" },
  { gene: "ABLIM3", ensemblId: "ENSG00000173210", description: "actin binding LIM protein family member 3", synonym: "KIAA0843", reference: "22684256", localization: "Actin Cytoskeleton" },
  { gene: "ACE2", ensemblId: "ENSG00000130234", description: "angiotensin converting enzyme 2", synonym: "ACEH", reference: "33116139", localization: "Motile Cilium Membrane" },
  { gene: "ACTR2", ensemblId: "ENSG00000138071", description: "actin related protein 2", synonym: "ARP2", reference: "22684256", localization: "Actin Cytoskeleton" }
];

async function loadCiliaHubData() {
  let data = ciliahubData;
  try {
    const response = await fetch('ciliahub_data.json');
    if (response.ok) {
      data = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch ciliahub_data.json:', error);
  }

  const tableBody = document.getElementById('ciliahub-table-body');
  const searchInput = document.getElementById('ciliahub-search');
  const filterSelect = document.getElementById('ciliahub-filter');
  const resetButton = document.getElementById('ciliahub-reset');
  const downloadButton = document.getElementById('download-ciliahub');

  function populateTable(filteredData) {
    tableBody.innerHTML = '';
    if (filteredData.length === 0) {
      const row = tableBody.insertRow();
      const cell = row.insertCell(0);
      cell.colSpan = 6;
      cell.textContent = 'No Data Available';
      cell.style.textAlign = 'center';
    } else {
      filteredData.forEach(item => {
        const row = tableBody.insertRow();
        // Gene: Link to NCBI Gene
        const geneCell = row.insertCell(0);
        geneCell.innerHTML = `<a href="https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(item.gene)}" target="_blank">${item.gene}</a>`;
        // Ensembl ID: Link to Ensembl
        const ensemblCell = row.insertCell(1);
        ensemblCell.innerHTML = `<a href="https://www.ensembl.org/id/${encodeURIComponent(item.ensemblId)}" target="_blank">${item.ensemblId}</a>`;
        // Description
        row.insertCell(2).textContent = item.description;
        // Synonym
        row.insertCell(3).textContent = item.synonym;
        // Reference: Link to PubMed for each PMID
        const referenceCell = row.insertCell(4);
        const pmids = item.reference.split(/[,;]\s*/).filter(pmid => pmid.trim());
        referenceCell.innerHTML = pmids.map(pmid => 
          `<a href="https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(pmid.trim())}" target="_blank">${pmid.trim()}</a>`
        ).join(', ');
        // Localization
        row.insertCell(5).textContent = item.localization;
      });
    }
  }

  function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedLocalization = filterSelect.value;

    const filteredData = data.filter(item => {
      const matchesSearch = !searchTerm || (
        item.gene.toLowerCase().includes(searchTerm) ||
        item.ensemblId.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm) ||
        item.synonym.toLowerCase().includes(searchTerm)
      );
      const matchesLocalization = !selectedLocalization || item.localization === selectedLocalization;
      return matchesSearch && matchesLocalization;
    });

    populateTable(filteredData);
  }

  function populateFilterOptions() {
    const localizations = [...new Set(data.map(item => item.localization))].sort();
    filterSelect.innerHTML = '<option value="">All Localizations</option>';
    localizations.forEach(loc => {
      const option = document.createElement('option');
      option.value = loc;
      option.textContent = loc;
      filterSelect.appendChild(option);
    });
  }

  function downloadCSV() {
    const headers = ['Gene', 'Ensembl ID', 'Gene Description', 'Synonym', 'Reference', 'Ciliary Localization'];
    const csvRows = [headers.join(',')];
    data.forEach(item => {
      const row = [
        `"${item.gene}"`,
        `"${item.ensemblId}"`,
        `"${item.description}"`,
        `"${item.synonym}"`,
        `"${item.reference}"`,
        `"${item.localization}"`
      ];
      csvRows.push(row.join(','));
    });
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'ciliahub_data.csv');
    link.click();
    URL.revokeObjectURL(url);
  }

  searchInput.addEventListener('input', applyFilters);
  filterSelect.addEventListener('change', applyFilters);
  resetButton.addEventListener('click', () => {
    searchInput.value = '';
    filterSelect.value = '';
    applyFilters();
  });
  downloadButton.addEventListener('click', downloadCSV);

  populateFilterOptions();
  populateTable(data);
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.hash === '#ciliahub') {
    loadCiliaHubData();
  }
});

window.addEventListener('hashchange', () => {
  if (window.location.hash === '#ciliahub') {
    loadCiliaHubData();
  }
});

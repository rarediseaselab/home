// Load and populate CiliaHub table and interactive elements
async function loadCiliaHubData() {
    try {
        const response = await fetch('/ciliahub_data.json'); // Adjust to '/home/ciliahub_data.json' if needed
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for /ciliahub_data.json`);
        }
        const text = await response.text();
        const data = JSON.parse(text);
        const tableBody = document.getElementById('ciliahub-table-body');
        const searchInput = document.getElementById('ciliahub-search');
        const filterSelect = document.getElementById('ciliahub-filter');
        const resetBtn = document.getElementById('ciliahub-reset');
        const downloadBtn = document.getElementById('download-ciliahub');
        const popularGenesList = document.getElementById('popular-genes');
        const ciliaryElements = {
            'cilia': document.querySelector('.ciliary-filled'),
            'transition-zone': document.querySelector('.transition-zone-fill'),
            'basal-body': document.querySelectorAll('.basal-body-element')
        };

        // Track popular genes (simplified: top 5 by search hits)
        let geneHits = {};

        // Function to populate table
        function populateTable(filteredData = Object.values(data)) {
            tableBody.innerHTML = '';
            popularGenesList.innerHTML = '';
            let processedCount = 0;
            filteredData.forEach((item, index) => {
                try {
                    const sanitizedLocalization = (item.localization || '')
                        .toLowerCase()
                        .replace(/[\s,]+/g, '-');
                    const pmids = (item.reference || '').split(';').map(pmid => pmid.trim()).filter(pmid => pmid);
                    const referenceLinks = pmids.length > 0
                        ? pmids.map(pmid => `<a href="https://pubmed.ncbi.nlm.nih.gov/${pmid}/" target="_blank">${pmid}</a>`).join(', ')
                        : 'N/A';
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><a href="https://www.ncbi.nlm.nih.gov/gene/?term=${item.gene || ''}" target="_blank">${item.gene || ''}</a></td>
                        <td><a href="https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${item.ensembl_id || ''}" target="_blank">${item.ensembl_id || ''}</a></td>
                        <td>${item.description || ''}</td>
                        <td>${item.synonym || ''}</td>
                        <td><a href="https://www.omim.org/entry/${item.omim_id || ''}" target="_blank">${item.omim_id || ''}</a></td>
                        <td>${referenceLinks}</td>
                        <td>${item.localization || ''}</td>
                    `;
                    if (sanitizedLocalization) {
                        row.classList.add(sanitizedLocalization);
                    }
                    tableBody.appendChild(row);
                    processedCount++;
                } catch (error) {
                    console.error(`Error processing entry ${index + 1}:`, error, 'Data:', item);
                }
            });

            // Update popular genes (top 5 by hits)
            const topGenes = Object.entries(geneHits)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([gene]) => `<li>${gene}</li>`).join('');
            popularGenesList.innerHTML = topGenes || '<li>No popular genes yet</li>';

            // Highlight ciliary compartments based on filtered data
            const localizations = new Set(filteredData.map(item => (item.localization || '').toLowerCase().replace(/[\s,]+/g, '-')));
            Object.keys(ciliaryElements).forEach(compartment => {
                const element = ciliaryElements[compartment];
                if (element) {
                    if (localizations.has(compartment) || localizations.has(compartment + '-')) {
                        if (element instanceof NodeList) {
                            element.forEach(el => el.style.fill = '#50C878');
                        } else {
                            element.style.fill = '#50C878';
                        }
                    } else {
                        if (element instanceof NodeList) {
                            element.forEach(el => el.style.fill = ''); // Reset to default (transparent or CSS-defined)
                        } else {
                            element.style.fill = ''; // Reset to default
                        }
                    }
                }
            });
            console.log('Rows populated:', processedCount);
        }

        // Initial population
        populateTable(Object.values(data));

        // Search functionality
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            const entries = Object.values(data);
            const filteredData = entries.filter(item =>
                (item.gene && item.gene.toLowerCase().includes(query)) ||
                (item.ensembl_id && item.ensembl_id.toLowerCase().includes(query)) ||
                (item.synonym && item.synonym.toLowerCase().includes(query)) ||
                (item.omim_id && item.omim_id.toLowerCase().includes(query)) ||
                (item.reference && item.reference.toLowerCase().includes(query))
            );
            // Update gene hits
            entries.forEach(item => {
                if (filteredData.some(fItem => fItem.gene === item.gene)) {
                    geneHits[item.gene] = (geneHits[item.gene] || 0) + 1;
                }
            });
            populateTable(filteredData);
        });

        // Filter functionality
        filterSelect.addEventListener('change', () => {
            const filterValue = filterSelect.value.toLowerCase();
            const entries = Object.values(data);
            let filteredData = entries;
            if (filterValue) {
                filteredData = entries.filter(item =>
                    (item.localization || '').toLowerCase().replace(/[\s,]+/g, '-') === filterValue
                );
            }
            // Update gene hits
            entries.forEach(item => {
                if (filteredData.some(fItem => fItem.gene === item.gene)) {
                    geneHits[item.gene] = (geneHits[item.gene] || 0) + 1;
                }
            });
            populateTable(filteredData);
        });

        // Reset functionality
        resetBtn.addEventListener('click', () => {
            searchInput.value = '';
            filterSelect.value = '';
            geneHits = {}; // Reset popular genes
            populateTable(Object.values(data));
        });

        // Download functionality
        downloadBtn.addEventListener('click', () => {
            const entries = Object.values(data);
            const csv = [
                ['Gene', 'Ensembl ID', 'Gene Description', 'Synonym', 'OMIM ID', 'Reference', 'Ciliary Localization'],
                ...entries.map(item => [
                    item.gene || '',
                    item.ensembl_id || '',
                    item.description || '',
                    item.synonym || '',
                    item.omim_id || '',
                    item.reference || '',
                    item.localization || ''
                ])
            ].map(row => row.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ciliahub_data.csv';
            a.click();
            window.URL.revokeObjectURL(url);
        });
    } catch (error) {
        console.error('Error loading CiliaHub data:', error);
        document.getElementById('ciliahub-table-body').innerHTML = '<tr><td colspan="7">Error loading data. Check the console or ensure ciliahub_data.json is accessible at /ciliahub_data.json. Status: ' + error.message + '</td></tr>';
    }
}

// Load data when the page is fully loaded
document.addEventListener('DOMContentLoaded', loadCiliaHubData);

// Interactive Ciliary Cell Logic
document.addEventListener('DOMContentLoaded', function() {
    const clickableElements = document.querySelectorAll('.clickable');
    const labelBox = document.getElementById('label-box');

    clickableElements.forEach(el => {
        el.addEventListener('mouseover', () => {
            labelBox.textContent = el.dataset.label;
        });
        el.addEventListener('mouseout', () => {
            labelBox.textContent = 'Hover over a part to see its name.';
        });
        el.addEventListener('click', () => {
            alert('You clicked on: ' + el.dataset.label);
        });
    });
});

// Existing JavaScript from index.html (Publications search, Lightbox, Back to Top, Night Mode)
const searchInput = document.getElementById('pub-search');
const pubList = document.getElementById('publications-list');
const pubs = pubList ? pubList.querySelectorAll('.research-item') : [];

if (searchInput && pubList) {
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        pubs.forEach(pub => {
            const text = pub.textContent.toLowerCase();
            pub.style.display = text.includes(query) ? 'flex' : 'none';
        });
    });
}

const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxLinks = document.querySelectorAll('.lightbox-link');
const closeBtn = document.querySelector('.lightbox-close');

if (lightbox && lightboxImage && lightboxLinks.length > 0 && closeBtn) {
    lightboxLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            lightboxImage.src = this.href;
            lightbox.style.display = 'flex';
        });
    });

    closeBtn.addEventListener('click', function() {
        lightbox.style.display = 'none';
    });

    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            lightbox.style.display = 'none';
        }
    });
}

const backToTopBtn = document.getElementById('back-to-top');
if (backToTopBtn) {
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            backToTopBtn.style.display = 'block';
        } else {
            backToTopBtn.style.display = 'none';
        }
    });

    backToTopBtn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

const nightModeToggle = document.getElementById('night-mode-toggle');
if (nightModeToggle) {
    if (localStorage.getItem('nightMode') === 'enabled') {
        document.body.classList.add('night-mode');
    }
    nightModeToggle.addEventListener('click', function() {
        document.body.classList.toggle('night-mode');
        localStorage.setItem('nightMode', document.body.classList.contains('night-mode') ? 'enabled' : 'disabled');
    });
}

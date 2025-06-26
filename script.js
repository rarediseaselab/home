// Load and populate CiliaHub table
async function loadCiliaHubData() {
    try {
        const response = await fetch('ciliahub_data.json');
        const data = await response.json();
        const tableBody = document.getElementById('ciliahub-table-body');
        const searchInput = document.getElementById('ciliahub-search');
        const filterSelect = document.getElementById('ciliahub-filter');
        const resetBtn = document.getElementById('ciliahub-reset');
        const downloadBtn = document.getElementById('download-ciliahub');

        // Function to populate table
        function populateTable(filteredData = data) {
            tableBody.innerHTML = '';
            filteredData.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.gene || ''}</td>
                    <td>${item.ensembl_id || ''}</td>
                    <td>${item.description || ''}</td>
                    <td>${item.synonym || ''}</td>
                    <td>${item.omim_id || ''}</td>
                    <td><a href="${item.reference_url || '#'}">${item.reference || 'N/A'}</a></td>
                    <td>${item.localization || ''}</td>
                `;
                row.classList.add(item.localization.toLowerCase().replace(' ', '-'));
                tableBody.appendChild(row);
            });
        }

        // Initial population
        populateTable();

        // Search functionality
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            const filteredData = data.filter(item =>
                (item.gene && item.gene.toLowerCase().includes(query)) ||
                (item.ensembl_id && item.ensembl_id.toLowerCase().includes(query)) ||
                (item.synonym && item.synonym.toLowerCase().includes(query)) ||
                (item.omim_id && item.omim_id.toLowerCase().includes(query))
            );
            populateTable(filteredData);
        });

        // Filter functionality
        filterSelect.addEventListener('change', () => {
            const filterValue = filterSelect.value.toLowerCase();
            let filteredData = data;
            if (filterValue) {
                filteredData = data.filter(item => item.localization.toLowerCase() === filterValue);
            }
            populateTable(filteredData);
        });

        // Reset functionality
        resetBtn.addEventListener('click', () => {
            searchInput.value = '';
            filterSelect.value = '';
            populateTable(data);
        });

        // Download functionality
        downloadBtn.addEventListener('click', () => {
            const csv = [
                ['Gene', 'Ensembl ID', 'Gene Description', 'Synonym', 'OMIM ID', 'Reference', 'Ciliary Localization'],
                ...data.map(item => [
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
        document.getElementById('ciliahub-table-body').innerHTML = '<tr><td colspan="7">Error loading data. Please check the console for details.</td></tr>';
    }
}

// Load data when the page is fully loaded
document.addEventListener('DOMContentLoaded', loadCiliaHubData);

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

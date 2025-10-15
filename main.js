const API_BASE_URL = 'https://kitanime-api.vercel.app/v1';
const STREAM_BASE_URL = 'https://kitanimev2.vercel.app';
let currentEpisodeData = null;
let playerInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Universal setup
    setupTheme();
    setupEventListeners();

    // Page-specific logic
    const bodyId = document.body.id;
    const params = new URLSearchParams(window.location.search);

    switch (bodyId) {
        case 'home-page':
            loadHomePage();
            break;
        case 'ongoing-list-page':
            loadOngoingListPage(1);
            break;
        case 'complete-page':
            loadCompletePage(1);
            break;
        case 'search-page':
            // Handled by event listener
            break;
        case 'genres-page':
            loadGenresPage();
            break;
        case 'genre-result-page':
            const genreSlug = params.get('slug');
            const genreName = params.get('name');
            if (genreSlug && genreName) {
                document.getElementById('genreTitle').textContent = genreName;
                loadAnimeByGenre(genreSlug, genreName, 1);
            }
            break;
        case 'detail-page':
            const detailSlug = params.get('slug');
            if (detailSlug) showDetail(detailSlug);
            break;
        case 'player-page':
            const episodeSlug = params.get('slug');
            const episodeTitle = params.get('title');
            if (episodeSlug) showPlayer(episodeSlug, episodeTitle);
            break;
    }
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                performSearch(searchInput.value);
            }, 500);
        });
    }

    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.addEventListener('click', toggleDarkMode);
    });
}

function setupTheme() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.textContent = isDarkMode ? '☀️' : '🌙';
    });
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.textContent = isDarkMode ? '☀️' : '🌙';
    });
}

async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        return {
            data: result.data,
            pagination: result.pagination || null
        };
    } catch (error) {
        console.error("Failed to fetch data:", error);
        return { data: null, pagination: null };
    }
}

async function loadHomePage() {
    const grid = document.getElementById('ongoingAnimeGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="loader">Loading anime...</div>';
    const result = await fetchData('home');
    if (result.data && result.data.ongoing_anime) {
        renderAnimeGrid(grid, result.data.ongoing_anime, 'ongoing');
    } else {
        grid.innerHTML = '<div class="loader">Failed to load anime.</div>';
    }
}

async function performSearch(query) {
    const grid = document.getElementById('searchResultsGrid');
    if (!grid) return;
    if (!query || query.trim() === '') {
        grid.innerHTML = '<div class="loader">Enter a query to search.</div>';
        return;
    }
    grid.innerHTML = `<div class="loader">Searching for "${query}"...</div>`;
    const { data } = await fetchData(`search/${encodeURIComponent(query)}`);
    if (data && data.length > 0) {
        renderAnimeGrid(grid, data, 'search');
    } else {
        grid.innerHTML = `<div class="loader">No results found for "${query}".</div>`;
    }
}

async function loadGenresPage() {
    const grid = document.getElementById('genresGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="loader">Loading genres...</div>';
    const { data } = await fetchData('genres');
    if (data && data.length > 0) {
        grid.innerHTML = '';
        data.forEach(genre => {
            const tag = document.createElement('div');
            tag.className = 'genre-tag';
            tag.textContent = genre.name;
            tag.onclick = () => {
                window.location.href = `genre.html?slug=${genre.slug}&name=${genre.name}`;
            };
            grid.appendChild(tag);
        });
    } else {
        grid.innerHTML = '<div class="loader">Failed to load genres.</div>';
    }
}

async function loadAnimeByGenre(slug, name, page = 1) {
    const grid = document.getElementById('genreResultsGrid');
    const paginationContainer = document.getElementById('genrePagination');
    if (!grid || !paginationContainer) return;
    
    grid.innerHTML = '<div class="loader">Loading anime...</div>';
    paginationContainer.innerHTML = '';

    const { data, pagination } = await fetchData(`genres/${slug}/${page}`);
    const paginationInfo = pagination || (data ? data.pagination : null);

    if (data && data.anime && data.anime.length > 0) {
        renderAnimeGrid(grid, data.anime, 'genre');
        renderPagination(paginationContainer, paginationInfo, (newPage) => loadAnimeByGenre(slug, name, newPage));
    } else {
        grid.innerHTML = `<div class="loader">No anime found in this genre.</div>`;
    }
}

async function loadOngoingListPage(page = 1) {
    const grid = document.getElementById('ongoingListGrid');
    const paginationContainer = document.getElementById('ongoingPagination');
    if (!grid || !paginationContainer) return;

    grid.innerHTML = '<div class="loader">Loading...</div>';
    paginationContainer.innerHTML = '';

    const { data, pagination } = await fetchData(`ongoing-anime/${page}`);
    if (data && data.length > 0) {
        renderAnimeGrid(grid, data, 'ongoing-list');
        renderPagination(paginationContainer, pagination, loadOngoingListPage);
    } else {
        grid.innerHTML = `<div class="loader">Failed to load ongoing anime.</div>`;
    }
}

async function loadCompletePage(page = 1) {
    const grid = document.getElementById('completeAnimeGrid');
    const paginationContainer = document.getElementById('completePagination');
    if (!grid || !paginationContainer) return;
    
    grid.innerHTML = '<div class="loader">Loading...</div>';
    paginationContainer.innerHTML = '';

    const { data, pagination } = await fetchData(`complete-anime/${page}`);
    if (data && data.length > 0) {
        renderAnimeGrid(grid, data, 'complete');
        renderPagination(paginationContainer, pagination, loadCompletePage);
    } else {
        grid.innerHTML = `<div class="loader">Failed to load complete anime.</div>`;
    }
}

function renderAnimeGrid(gridElement, animeList, type) {
    gridElement.innerHTML = '';
    animeList.forEach(anime => {
        const card = document.createElement('div');
        card.className = 'anime-card';
        card.onclick = () => {
            window.location.href = `detail.html?slug=${anime.slug}`;
        };

        let metaInfo = '';
        if (type === 'ongoing' || type === 'ongoing-list') {
            metaInfo = `<div class="episode-badge">${anime.current_episode}</div>`;
        } else if (type === 'search' || type === 'genre' || type === 'complete') {
            metaInfo = `<div class="rating-badge">⭐ ${anime.rating || 'N/A'}</div>`;
        }

        let bottomInfo = '';
        if (type === 'search') {
            bottomInfo = `<div class="search-result-genres">${anime.genres.map(g => g.name).join(', ')}</div>`;
        } else if (type === 'ongoing' || type === 'ongoing-list') {
            bottomInfo = `<div class="anime-meta"><span>${anime.release_day}</span><span>${anime.newest_release_date}</span></div>`;
        } else if (type === 'complete') {
            bottomInfo = `<div class="anime-meta"><span>${anime.episode_count} Episodes</span></div>`;
        }

        card.innerHTML = `
            <div class="anime-poster" style="background-image: url('${anime.poster}')">${metaInfo}</div>
            <div class="anime-info">
                <div class="anime-title">${anime.title}</div>
                ${bottomInfo}
            </div>
        `;
        gridElement.appendChild(card);
    });
}

async function showDetail(slug) {
    const container = document.getElementById('detailPageContainer');
    if (!container) return;
    container.innerHTML = '<div class="loader">Loading details...</div>';

    const { data: anime } = await fetchData(`anime/${slug}`);
    if (anime) {
        const genresHtml = anime.genres.map(g => `<span class="genre-tag" onclick="window.location.href='genre.html?slug=${g.slug}&name=${g.name}'">${g.name}</span>`).join('');
        const episodesHtml = anime.episode_lists.map(ep => `
            <div class="episode-card" onclick="window.location.href='player.html?slug=${ep.slug}&title=${encodeURIComponent(anime.title + ' - ' + ep.episode)}'">
                <div class="episode-name">${ep.episode}</div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="detail-header" style="background-image: url('${anime.poster}')"></div>
            <button class="back-btn" onclick="history.back()">←</button>
            <div class="detail-content">
                <div class="detail-card">
                    <div class="detail-title">${anime.title}</div>
                    <div class="genres-list">${genresHtml}</div>
                    <div class="detail-meta-grid">
                        <div class="meta-item"><span>Rating</span><span>⭐ ${anime.rating || 'N/A'}</span></div>
                        <div class="meta-item"><span>Status</span><span>${anime.status}</span></div>
                        <div class="meta-item"><span>Total Eps</span><span>${anime.episode_count || '?'}</span></div>
                        <div class="meta-item"><span>Durasi</span><span>${anime.duration}</span></div>
                    </div>
                    <div class="synopsis"><strong>Synopsis:</strong><br>${anime.synopsis || 'No synopsis available.'}</div>
                    <div class="episodes-title">Episodes</div>
                    <div class="episodes-list">${episodesHtml}</div>
                </div>
            </div>`;
        // Re-run theme setup for theme toggle button on this dynamic content
        setupTheme();
    } else {
        container.innerHTML = '<div class="loader">Failed to load details.</div>';
    }
}

async function showPlayer(episodeSlug, episodeTitle) {
    const container = document.getElementById('playerContainer');
    if (!container) return;
    container.innerHTML = '<div class="loader" style="color: white;">Loading player...</div>';

    const { data } = await fetchData(`episode/${episodeSlug}`);
    currentEpisodeData = data;

    if (data && data.steramList) {
        const qualities = Object.keys(data.steramList).map(q => parseInt(q.replace('p', '')));
        const highestQuality = Math.max(...qualities);

        const sources = Object.entries(data.steramList).map(([quality, url]) => ({
            src: `${STREAM_BASE_URL}${url}`,
            type: 'video/mp4',
            size: parseInt(quality.replace('p', ''))
        }));

        container.innerHTML = `
            <div class="player-header">
                <button class="player-back-btn" onclick="history.back()">←</button>
                <div class="player-title">${decodeURIComponent(episodeTitle)}</div>
            </div>
            <div class="player-container">
                <video id="videoPlayer" playsinline controls></video>
            </div>
            <div class="player-controls">
                <button class="download-links-btn" onclick="showDownloadLinks('${decodeURIComponent(episodeTitle)}')">
                    Download Links
                </button>
            </div>
        `;

        playerInstance = new Plyr('#videoPlayer', {
            quality: { default: highestQuality, options: qualities, forced: true }
        });
        playerInstance.source = { type: 'video', sources: sources };
    } else {
        container.innerHTML = '<div class="loader" style="color: white;">Failed to load stream.</div>';
    }
}

function renderPagination(container, paginationData, pageClickCallback) {
    container.innerHTML = '';
    if (!paginationData || !paginationData.last_visible_page || paginationData.last_visible_page <= 1) {
        return;
    }

    const { current_page, has_previous_page, previous_page, has_next_page, next_page, last_visible_page } = paginationData;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '« Prev';
    prevBtn.disabled = !has_previous_page;
    prevBtn.onclick = () => pageClickCallback(previous_page);
    container.appendChild(prevBtn);

    const pagesToShow = [];
    if (last_visible_page <= 7) {
        for (let i = 1; i <= last_visible_page; i++) pagesToShow.push(i);
    } else {
        pagesToShow.push(1);
        if (current_page > 3) pagesToShow.push('...');
        if (current_page > 2) pagesToShow.push(current_page - 1);
        if (current_page !== 1 && current_page !== last_visible_page) pagesToShow.push(current_page);
        if (current_page < last_visible_page - 1) pagesToShow.push(current_page + 1);
        if (current_page < last_visible_page - 2) pagesToShow.push('...');
        pagesToShow.push(last_visible_page);
    }

    [...new Set(pagesToShow)].forEach(page => {
        if (page === '...') {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.style.cssText = 'color: var(--secondary-text); align-self: center; padding: 0 5px;';
            container.appendChild(dots);
        } else {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = page;
            if (page === current_page) pageBtn.classList.add('active');
            pageBtn.onclick = () => pageClickCallback(page);
            container.appendChild(pageBtn);
        }
    });

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next »';
    nextBtn.disabled = !has_next_page;
    nextBtn.onclick = () => pageClickCallback(next_page);
    container.appendChild(nextBtn);
}

function showDownloadLinks(episodeTitle) {
    const modal = document.getElementById('downloadModal');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalEpisodeTitle');
    
    modalTitle.textContent = episodeTitle;
    modal.classList.add('show');

    if (currentEpisodeData && currentEpisodeData.download_urls) {
        let downloadHtml = '';
        const processFormat = (format, title) => {
            if (currentEpisodeData.download_urls[format] && currentEpisodeData.download_urls[format].length > 0) {
                downloadHtml += `<div class="download-section"><h4>${title}</h4>`;
                currentEpisodeData.download_urls[format].forEach(res => {
                    downloadHtml += `<div class="resolution-group"><strong>${res.resolution}:</strong> `;
                    res.urls.forEach(provider => {
                        downloadHtml += `<a href="${provider.url}" target="_blank" rel="noopener noreferrer">${provider.provider}</a>`;
                    });
                    downloadHtml += `</div>`;
                });
                downloadHtml += `</div>`;
            }
        };
        processFormat('mp4', 'MP4');
        processFormat('mkv', 'MKV');
        modalBody.innerHTML = downloadHtml || 'No download links available.';
    } else {
        modalBody.innerHTML = 'Download links not available.';
    }
}

function closeModal() {
    document.getElementById('downloadModal').classList.remove('show');
}

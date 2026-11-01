const tg = window.Telegram.WebApp;
tg.expand(); 

// ВСТАВЬ СЮДА СВОЙ API URL С АМВЕРЫ
const API_URL = "https://твой-проект.amvera.io"; 
const userId = tg.initDataUnsafe?.user?.id || 123456789;
let allMovies = [];
let featuredMovie = null;

// --- НАВИГАЦИЯ ---
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(pageId === 'mainPage') document.getElementById('navHome').classList.add('active');
    if(pageId === 'searchPage') document.getElementById('navSearch').classList.add('active');
    if(pageId === 'profilePage') document.getElementById('navProfile').classList.add('active');
    
    if(pageId === 'profilePage') loadProfile();
    window.scrollTo(0, 0);
}

// --- ДИНАМИЧЕСКИЕ ТЕМЫ ---
function applyTheme(category) {
    document.body.className = ''; // Сброс
    if (!category) return;
    
    const cat = category.toLowerCase();
    if (cat.includes('ужас')) document.body.classList.add('theme-horror');
    else if (cat.includes('мульт') || cat.includes('аниме')) document.body.classList.add('theme-cartoon');
    else if (cat.includes('боевик') || cat.includes('фантаст')) document.body.classList.add('theme-action');
}

// --- ГЕНЕРАЦИЯ ОБЛОЖКИ (Если нет картинки) ---
function generateCover(title, category) {
    const gradients = [
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
        'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
        'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
        'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    ];
    // Берем цвет в зависимости от названия, чтобы он не менялся
    let hash = 0;
    for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
    const bg = gradients[Math.abs(hash) % gradients.length];
    
    // Для ужасов делаем мрачный фон
    const isHorror = category.toLowerCase().includes('ужас');
    const finalBg = isHorror ? 'linear-gradient(135deg, #050505 0%, #3a0000 100%)' : bg;

    return `<div class="gen-cover" style="background: ${finalBg};">${title}</div>`;
}

// --- ЗАГРУЗКА ДАННЫХ ---
async function loadMovies() {
    try {
        const res = await fetch(`${API_URL}/api/movies`);
        const data = await res.json();
        allMovies = data.movies;
        
        if (allMovies.length > 0) {
            featuredMovie = allMovies[0]; // Берем первый фильм для баннера
            document.getElementById('heroTitle').innerText = featuredMovie.title;
            applyTheme(featuredMovie.category);
        }
        
        renderMainPage();
    } catch(e) { console.error("Ошибка API", e); }
}

function renderMainPage() {
    const container = document.getElementById('categoriesContainer');
    container.innerHTML = '';
    
    const categories = {};
    allMovies.forEach(m => {
        if(!categories[m.category]) categories[m.category] = [];
        categories[m.category].push(m);
    });

    for(const [cat, movies] of Object.entries(categories)) {
        let html = `<div class="category-row"><div class="category-title">${cat}</div><div class="movies-slider">`;
        movies.forEach(m => html += createMovieCard(m));
        html += `</div></div>`;
        container.innerHTML += html;
    }
}

function createMovieCard(m) {
    const cover = (m.image_url && m.image_url !== 'generated') 
        ? `<img src="${m.image_url}" class="movie-poster" loading="lazy">` 
        : generateCover(m.title, m.category);
        
    const priceText = m.price === 0 ? 'Бесплатно' : `${m.price} ⭐`;
    
    return `
        <div class="movie-card" onclick="openPlayer(${m.id}, '${m.title}', ${m.price}, '${m.category}')">
            ${cover}
            <div class="movie-info">
                <div class="movie-title">${m.title}</div>
                <div class="movie-price">${priceText}</div>
            </div>
        </div>
    `;
}

// --- ПОИСК С ПОДСКАЗКАМИ ---
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const sugBox = document.getElementById('suggestionsBox');
    const resultsGrid = document.getElementById('searchResults');
    
    if(query.length === 0) {
        sugBox.innerHTML = '';
        resultsGrid.innerHTML = '';
        return;
    }

    const matches = allMovies.filter(m => m.title.toLowerCase().includes(query) || m.category.toLowerCase().includes(query));
    
    // Подсказки (выпадающий список)
    sugBox.innerHTML = matches.slice(0, 5).map(m => 
        `<div class="suggestion-item" onclick="selectSearch('${m.title}')">${m.title} <span style="color:gray;font-size:12px;">(${m.category})</span></div>`
    ).join('');

    // Результаты сеткой
    resultsGrid.innerHTML = matches.map(m => createMovieCard(m)).join('');
});

function selectSearch(title) {
    searchInput.value = title;
    searchInput.dispatchEvent(new Event('input'));
    document.getElementById('suggestionsBox').innerHTML = '';
}

// --- ПРОФИЛЬ ---
async function loadProfile() {
    try {
        const res = await fetch(`${API_URL}/api/user/${userId}`);
        const data = await res.json();
        if(!data.error) {
            document.getElementById('userAvatar').innerText = data.first_name[0].toUpperCase();
            document.getElementById('userName').innerText = data.first_name;
            document.getElementById('userUsername').innerText = `@${data.username || 'нет'}`;
            document.getElementById('statWatchTime').innerText = data.watch_time + 'ч';
            document.getElementById('statMoviesBought').innerText = data.movies_bought;
            document.getElementById('statRefs').innerText = data.ref_count;
            document.getElementById('statBalance').innerText = data.balance;
        }
    } catch(e) { console.error(e); }
}

async function showMyMovies() {
    showPage('myMoviesPage');
    const list = document.getElementById('myMoviesList');
    list.innerHTML = '<p style="color:gray;">Загрузка...</p>';
    
    try {
        const res = await fetch(`${API_URL}/api/user/${userId}/movies`);
        const data = await res.json();
        if(data.movies.length === 0) {
            list.innerHTML = '<p style="color:gray;">Вы еще не купили ни одного фильма.</p>';
        } else {
            list.innerHTML = data.movies.map(m => createMovieCard(m)).join('');
        }
    } catch(e) { list.innerHTML = 'Ошибка загрузки'; }
}

// --- ПЛЕЕР ---
function openPlayer(mId, title, price, category) {
    applyTheme(category); // Меняем тему под фильм
    
    if(price > 0) {
        tg.showAlert(`Оплатите фильм за ${price} ⭐ в боте!`);
        return;
    }
    
    document.getElementById('playerTitle').innerText = title;
    document.getElementById('playerModal').classList.add('active');
    // Сюда в будущем мы будем ставить реальную ссылку на видео с бэкенда
    document.getElementById('videoPlayer').src = "https://www.w3schools.com/html/mov_bbb.mp4"; 
}

function closePlayer() {
    document.getElementById('playerModal').classList.remove('active');
    document.getElementById('videoPlayer').pause();
}

function playFeatured() {
    if(featuredMovie) openPlayer(featuredMovie.id, featuredMovie.title, featuredMovie.price, featuredMovie.category);
}

// Инициализация
window.onload = () => {
    loadMovies();
};

const delay = (time = 1) => new Promise((resolve, reject) => setTimeout(resolve, time));
const lerp = (a, b, r) => (a * (1 - r)) + (b * r);
const clamp = (v, a, b) => Math.max(a,Math.min(b, v));

const app = new Vue({
  el: '#app',
  data: {
    state: 'menu',
    showSplash: true,
    hoveredCategory: -1,
    selectedCategory: -1,
    hoveredArticle: -1,
    selectedArticle: -1,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    splashTitleFrame: 1,
    TOUCH: 'ontouchstart' in document,
    spotlightImageIndex: 0,
    imagesIndex: Array.from(document.querySelectorAll('.articles-data img')).map(e => {
      const articleName = e.parentNode.getAttribute('data-name');
      const categoryIndex = Array.from(document.querySelectorAll('.articles-data .category')).indexOf(e.parentNode.parentNode);
      return {
        src: e.getAttribute('data-src'),
        url: `${categoryIndex + 1}_${articleName.split(' ').join('_')}`
      }
    }).filter(e => !!e.src)
  },
  computed: {
    currentCategory() {
      if (this.selectedCategory === -1) return;
      return this.categories[this.selectedCategory];
    },
    currentArticle() {
      if (this.selectedCategory === -1) return;
      if (this.selectedArticle === -1) return;
      return this.categories[this.selectedCategory].articles[this.selectedArticle];
    },
    categories() {
      return Array.from(document.querySelectorAll('.articles-data .category')).map(category => {
        const name = category.getAttribute('data-name');
        return {
          el: category,
          name: name,
          type: category.getAttribute('data-type'),
          articles: Array.from(document.querySelectorAll(`.articles-data .category[data-name='${name}'] .article`)).map(article => {
            
            let previewImgSrc = '';
            const specifiedSrc = article.getAttribute('data-preview-src');
            if (specifiedSrc) {
              previewImgSrc = specifiedSrc;
            } else {
              const firstImage = article.querySelector('img');
              
              if (firstImage) {
                previewImgSrc = firstImage.getAttribute('data-src');
              }
              
            }
            
            return {
              el: article,
              name: article.getAttribute('data-name'),
              previewImgSrc: previewImgSrc
            }
          })
        }
      });
    },
    isLandscape() {
      return this.windowWidth > this.windowHeight;
    }
  },
  watch: {
    async state(newVal) {
      window.location.hash = newVal;

      if (/category_[0-9]+/.test(this.state)) {
        await delay();
        this.updateItems();
      }
    }
  },
  methods: {
    back() {
      history.back();
    },
    onResize() {
      this.windowWidth = window.innerWidth;
      this.windowHeight = window.innerHeight;
      this.TOUCH = 'ontouchstart' in document;
    },
    async openSpotlight(div, move = true) {
      const imgCoords = div.getBoundingClientRect();

      this.spotlightImg = div;
      this.spotlightImageIndex = Array.from(div.parentNode.children).indexOf(div);

      const img = new Image();
      img.src = div.getAttribute('data-src');

      const spotlight = document.querySelector('.spotlight');
      const background = document.querySelector('.spotlight-background');

      spotlight.style.backgroundImage = `url('${div.getAttribute('data-src')}')`;
      spotlight.style.display = 'block';
      spotlight.style.left = `${imgCoords.left}px`;
      spotlight.style.top = `${imgCoords.top}px`;

      background.style.display = 'block';
      
      if (move) await delay();

      const maxWidth = window.innerWidth - 200; // Max width for the image
      const maxHeight = window.innerHeight - 200;    // Max height for the image
      let ratio = 0;  // Used for aspect ratio
      let width = img.width;    // Current image width
      let height = img.height;  // Current image height

      // Check if the current width is larger than the max
      if(width > maxWidth){
        ratio = maxWidth / width;   // get ratio for scaling image
        spotlight.style.width = `${maxWidth}px`; // Set new width
        spotlight.style.height = `${height * ratio}px`; // Scale height based on ratio
        height = height * ratio;    // Reset height to match scaled image
        width = width * ratio;    // Reset width to match scaled image
      }

      // Check if current height is larger than max
      if(height > maxHeight){
        ratio = maxHeight / height; // get ratio for scaling image
        spotlight.style.height = `${maxHeight}px`; // Set new height
        spotlight.style.width = `${width * ratio}px`; // Scale width based on ratio
        width = width * ratio;    // Reset width to match scaled image
        height = height * ratio;    // Reset height to match scaled image
      }
      
      spotlight.style.left = `calc(50% - ${width / 2}px)`;
      spotlight.style.top = `calc(50% - ${height / 2}px)`;
      spotlight.style.width = `${width}px`;
      spotlight.style.height = `${height}px`;

      background.style.opacity = 1;

      document.addEventListener('keyup', this.handleSpotlightKey);
    },
    async closeSpotlight(tagName) {

      if (tagName !== 'DIV') return;

      const spotlight = document.querySelector('.spotlight');
      const background = document.querySelector('.spotlight-background');

      const coords = this.spotlightImg.getBoundingClientRect();

      background.style.opacity = 0;
      spotlight.style.left = `${coords.left}px`;
      spotlight.style.top = `${coords.top}px`;
      spotlight.style.width = '177px';
      spotlight.style.height = '100px';

      await delay(200);

      spotlight.style.display = 'none';
      background.style.display = 'none';

      document.removeEventListener('keyup', this.handleSpotlightKey);
    },
    moveSpotlight(delta) {
      const nextDiv = this.spotlightImg[delta > 0 ? 'nextSibling' : 'previousSibling'];
      if (nextDiv) this.openSpotlight(nextDiv, false);
    },
    openSpotlightArticle() {
      window.location.hash = this.spotlightImg.getAttribute('data-url');
    },
    updateItems() {
      const items = document.querySelector('.items')?.children;

      if (items) {
        for (const item of items) {
          const box = item.getBoundingClientRect();
          const dist = Math.abs((box.top + box.height / 2) - window.innerHeight / 2)**2 * 0.002;

          const val = clamp(lerp(1, 0, dist / 100) + 0.3, 0, 1);
          item.style.opacity = val;
          item.style.transform = `scale(${val})`;
        }
      }
    },
    handleSpotlightKey({ key }) {
      if (key === 'ArrowLeft') this.moveSpotlight(-1);
      if (key === 'ArrowRight') this.moveSpotlight(1);

      if (key === 'Escape') this.closeSpotlight('DIV');
    },
    scrollItems(windowEvent) {

      const evt = windowEvent.event;
      const items = document.querySelector('.items');
      return;
      evt.preventDefault();

      if (evt.deltaY === 0) return;

      if (evt.deltaY > 0) {
        items.scrollBy({
          top: 34,
          left: 0,
          behavior: 'smooth'
        });

        return;
      }

      items.scrollBy({
        top: -34,
        left: 0,
        behavior: 'smooth'
      });
    },
    isCategory(state) {
      return this.categories.map(e => e.name).indexOf(state) !== -1;
    }
  },
  mounted() {
    this.$nextTick(() => {
      window.addEventListener('resize', this.onResize);
    });

    if (this.TOUCH) {
      document.body.classList.add('touch');
    }
  }
});

const images = [];
(() => {
  for (let i = 1; i < 8; i++) preload(`images/title/${i}.png`);
  for (let i = 0; i < app.categories[2].articles.length; i++) preload(`images/3-RESEARCH/FMF-ISSUE-${i+1}.jpg`);
})();

/*
(() => {

  const splash = document.querySelector('.screen.splash');

  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d');

  const image = document.createElement('img');
  image.src = 'images/title/1.png';

  image.addEventListener('load', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    const im = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < im.data.length; i += 4) {
      if (
        !im.data[i + 3] !== 255
      ) {
        im.data[i] = 255;
        im.data[i + 1] = 0;
        im.data[i + 2] = 0;
      }
    }
    ctx.putImageData(im, 0, 0);
  });

  document.body.addEventListener('click', () => {
    window.setTimeout(() => {
      app.showSplash = false;
    }, 300);

    const interval = window.setInterval(() => {
      if (app.splashTitleFrame < 7) {
        app.splashTitleFrame++;
        image.src = `images/title/${app.splashTitleFrame}.png`;
      } else {
        window.clearInterval(interval);
      }
    }, 50);
  });


})();*/

document.body.addEventListener('click', () => {
  app.showSplash = false;
});

/*window.setTimeout(() => {
  app.showSplash = false;
}, 3e3);*/

window.addEventListener('hashchange', handleUrlChange);
window.addEventListener('load', handleUrlChange);
window.addEventListener('load', () => {
  window.setTimeout(() => {
    const overlay = document.querySelector('.overlay');
    overlay.style.opacity = 0;
  }, 200);
});

function handleUrlChange() {
  const hash = decodeURIComponent(window.location.hash.replace(/#/, ''));
  
  if (hash) {

    if (hash === 'menu') {
      app.state = hash;
      return;
    }

    app.showSplash = false;
    const splash = document.querySelector('.splash');
    if (splash) splash.style.display = 'none';

    if (app.isCategory(hash)) {
      app.selectedCategory = app.categories.map(e => e.name).indexOf(hash);
      app.state = hash;
      return;
    }

    if (/[0-9]+_.+?/.test(hash)) {
      const articleName = hash.split('_').slice(1).join(' ');
      const category = parseInt(hash.split('_')[0]) - 1;
      const articleIndex = app.categories[category].articles.findIndex(e => e.name === articleName);
      
      if (articleIndex !== -1) {
        app.selectedCategory = category;
        app.selectedArticle = articleIndex;
        app.state = hash;
      }

    }

  } else {
    window.location.hash = 'menu';
  }
}

function preload() {
  for (const url of arguments) {
    const img = new Image();
    img.src = url;

    images.push(img);
  }
}

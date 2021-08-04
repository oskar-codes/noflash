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
    splashTitleFrame: 1,
    TOUCH: 'ontouchstart' in document,
    imagesIndex: Array.from(document.querySelectorAll('.articles-data img')).map(e => e.getAttribute('data-src'))
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
    updateImages() {
      window.setTimeout(() => {
        yall();
      });
    },
    back() {
      history.back();
    },
    onResize() {
      this.windowWidth = window.innerWidth;
      this.TOUCH = 'ontouchstart' in document;
    },
    async openSpotlight(windowEvent) {

      const div = windowEvent.event.target;
      const imgCoords = div.getBoundingClientRect();

      this.spotlightImg = div;

      const img = new Image();
      img.src = div.getAttribute('data-src');

      const spotlight = document.querySelector('.spotlight');
      const background = document.querySelector('.spotlight-background');

      spotlight.style.backgroundImage = `url('${div.getAttribute('data-src')}')`;
      spotlight.style.display = 'block';
      spotlight.style.left = `${imgCoords.left}px`;
      spotlight.style.top = `${imgCoords.top}px`;

      background.style.display = 'block';
      
      await delay();

      const sizeLandscape = 0.7;
      const sizePortrait = 0.7;

      const width = img.width > img.height ? 
        window.innerWidth * sizeLandscape // landscape
      : window.innerHeight * sizePortrait * (img.width / img.height); // portrait
      const height = img.width > img.height ? 
        window.innerWidth * sizeLandscape * (img.height / img.width) // landscape
      : window.innerHeight * sizePortrait // portrait
      
      spotlight.style.left = `calc(50% - ${width / 2}px)`;
      spotlight.style.top = `calc(50% - ${height / 2}px)`;
      spotlight.style.width = `${width}px`;
      spotlight.style.height = `${height}px`;

      background.style.opacity = 1;

    },
    async closeSpotlight() {
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

(() => {


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

    window.setInterval(() => {
      if (app.splashTitleFrame < 7) {
        app.splashTitleFrame++;
        image.src = `images/title/${app.splashTitleFrame}.png`;
      }
    }, 50);
  });


})();

/*window.setTimeout(() => {
  app.showSplash = false;
}, 3e3);*/

window.addEventListener('hashchange', handleUrlChange);
window.addEventListener('load', handleUrlChange);

function handleUrlChange() {
  const hash = decodeURIComponent(window.location.hash.replace(/#/, ''));
  if (hash) {

    if (hash === 'menu') {
      app.state = hash;
      return;
    }

    app.showSplash = false;
    const splash = document.querySelector('.screen.splash');
    if (splash) splash.style.display = 'none';

    if (/category_[0-9]+/.test(hash)) {
      app.selectedCategory = parseInt(hash.replace(/category_/, '')) - 1;
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

  app.updateImages();
}

function preload() {
  for (const url of arguments) {
    const img = new Image();
    img.src = url;

    images.push(img);
  }
}
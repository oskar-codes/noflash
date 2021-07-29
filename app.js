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
    state(newVal) {
      window.location.hash = newVal;
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
    },
    openImage(img) {
      window.open(img);
    }
  },
  mounted() {
    this.$nextTick(() => {
      window.addEventListener('resize', this.onResize);
    });
  }
});

(() => {
  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d');

  const image = document.createElement('img');
  image.src = 'images/title/1.png';


  image.addEventListener('load', () => {
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

function handleUrlChange(event) {
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
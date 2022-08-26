const express = require("express")
const app = express()

const env = require("dotenv")
env.config()

const clientSessions = require("client-sessions")

const path = require("path")
const musicService = require("./musicService")
const userService = require("./userService")
const newsService = require("./newsService")

const multer = require("multer");
const stripJs = require('strip-js');
const cloudinary = require('cloudinary').v2
const streamifier = require('streamifier')

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
  secure: true
})

const exphbs = require('express-handlebars')
app.engine('.hbs', exphbs.engine({
  extname: '.hbs',
  defaultLayout: 'main',
  helpers: {
    //automatically renders the correct <li> element adding the class "active" if app.locals.activeRoute matches the provided url
    navLink: function(url, options){
        return '<li class="nav-item"><a class="btn btn-outline-secondary me-2 ' + ((url == app.locals.activeRoute) ? 'active" aria-current="page"' : '"') + ' href="' + url + '">' + options.fn(this) + '</a></li>';
    },
    //evaluates conditions for equality
    equal: function (lvalue, rvalue, options) {
        if (arguments.length< 3)
            throw new Error("Handlebars Helper equal needs 2 parameters");
        if (lvalue != rvalue) {
            return options.inverse(this);
        } else {
            return options.fn(this);
        }
    },
    safeHTML: function(context){
        return stripJs(context);
    },
    formatDate: function(dateObj){
        let year = dateObj.getFullYear();
        let month = (dateObj.getMonth() + 1).toString();
        let day = dateObj.getDate().toString();
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2,'0')}`;
    }    
  }
}))
app.set('view engine', '.hbs')

const HTTP_PORT = process.env.PORT || 8080

function onHttpStart() {
  console.log("Express Server is running on PORT: " + HTTP_PORT + " 🚀")
}

app.use(express.static("public"));

app.use(clientSessions({
  cookieName: "session",
  secret: "yourTuneMusicApp25082022clientSessions",
  duration: 2 * 60 * 1000,
  activeDuration: 60 * 1000
}))

function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect("/login");
  } else {
    next();
  }
}

app.use(function(req, res, next) {
  res.locals.session = req.session;
  next();
});

const upload = multer(); // no { storage: storage } since we are not using disk storage

app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
 let albumsData = await musicService.getAlbums()//.then((albumsData) => console.log(albumsData))
  res.render('index', {
    data: albumsData,
    layout: 'main'
})
})

app.get("/albums/new", ensureLogin, (req, res) => {
  musicService.getGenres().then((genres) => {
    res.render('albumForm', {
      data: genres,
      layout: 'main'
    })
  })
})

app.get("/albums", ensureLogin, (req, res) => {
  if (req.query.genre) {
    musicService.getAlbumsByGenre(req.query.genre).then((genreAlbumsData) => {
      res.render('albums', {
        data: genreAlbumsData,
        layout: 'main'
      })
    }).catch((err) => {
      console.log(err)
    })
  } else {
    musicService.getAlbums().then((albumsData) => {
      console.log(albumsData)
      res.render('albums', {
        data: albumsData,
        layout: 'main'
      })
    }).catch((err) => {
      console.log(err)
    })
  }
})

app.get("/albums/new", ensureLogin, (req, res) => {
  musicService.getGenres().then((genres) => {
    res.render('albumForm', {
      data: genres,
      layout: 'main'
    })
  })
})

app.get("/albums/:id", ensureLogin, (req, res) => {
  musicService.getAlbumById(req.params.id).then((album) => {
    res.render('index', {
      data: album,
      layout: 'main'
    })
  }).catch((err) => {
    res.json({ message: err })
  })
})

app.post("/albums/new", ensureLogin, upload.single("albumCover"), (req, res) => {
  if (req.file) {
    let streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    async function upload(req) {
      let result = await streamUpload(req);
      return result;
    }

    upload(req).then((uploaded) => {
      processAlbum(uploaded.url);
    });
  } else {
    processAlbum("");
  }

  function processAlbum(imageUrl) {
    req.body.albumCover = imageUrl;

    console.log(req.body)

    musicService.addAlbum(req.body).then(() => {
      res.redirect("/albums")
    })
  }

})


app.get("/genres", ensureLogin, (req, res) => {
  musicService.getGenres().then((genres) => {
    res.render('genres', {
      data: genres,
      layout: 'main'
    })
  }).catch((err) => {
    console.log(err)
  })
})

app.get("/genres/new", ensureLogin, (req, res) => {
  res.render('genreForm')
})

app.post("/genres/new", ensureLogin, (req, res) => {
  musicService.addGenre(req.body).then(() => {
    res.redirect('/genres')
  }).catch((err) => {
    res.status(500).send(err)
  })
})

app.get('/genres/delete/:id', ensureLogin, (req, res) => {
  musicService.deleteGenre(req.params.id).then(() => {
    res.redirect('/genres')
  }).catch((err) => {
    res.status(500).send("ERROR - GENRE DELETE FAILURE")
  })
})

app.get('/albums/delete/:id', ensureLogin, (req, res) => {
  musicService.deleteAlbum(req.params.id).then(() => {
    res.redirect('/albums')
  }).catch((err) => {
    res.status(500).send("ERROR - ALBUM DELETE FAILURE")
  })
})

app.get("/songs/new", ensureLogin, (req, res) => {
  musicService.getAlbums().then((albumsData) => {
    res.render('songForm', {
      data: albumsData,
      layout: 'main'
    })
  }).catch((err) => {
    console.log(err)
  })})

app.post("/songs/new", ensureLogin, upload.single("songFile"), (req, res) => {
  if (req.file) {
    let streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
          {resource_type: 'video',
          use_filename: true },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    async function upload(req) {
      let result = await streamUpload(req);
      return result;
    }

    upload(req).then((uploaded) => {
      processSong(uploaded.url);
    });
  } else {
    processSong("");
  }

  function processSong(imageUrl) {
    req.body.songFile = imageUrl;

    console.log(req.body)

    musicService.addSong(req.body).then((albumID) => {
      res.redirect(`/songs/${albumID}`)
    })
  }
})

app.get("/songs/:id", ensureLogin, (req, res) => {
  musicService.getSongs(req.params.id).then((songs) => {
    res.render('songs', {
      data: songs,
      layout: 'main'
    })
  }).catch((err) => {
    console.log(err)
  })
})

app.get('/songs/delete/:id', ensureLogin, (req, res) => {
  musicService.deleteSong(req.params.id).then((albumID) => {
    res.redirect(`/songs/${albumID}`)
  }).catch((err) => {
    res.status(500).send("ERROR - SONG DELETE FAILURE")
  })
})

app.get("/register", (req, res) => {
  res.render('registerForm')
})

app.post("/register", (req, res) => {
  userService.registerUser(req.body).then((data) => {
    console.log(data)
    res.render('registerForm', {
      layout: 'main',
      successMessage: "USER SUCCESSFULLY CREATED!"
    })
  }).catch((err) => {
    console.log(err)
    res.render('registerForm', {
      layout: 'main',
      errorMessage: "USER REGISTRATION FAILED ERROR: "+err
    })
  })
})

app.get("/login", (req, res) => {
  res.render('loginForm')
})

app.post("/login", (req, res) => {
  req.body.userAgent = req.get('User-Agent')
  userService.loginUser(req.body).then((user) => {
    // add session stuff
    req.session.user = {
      username: user.username,
      email: user.email,
      loginHistory: user.loginHistory
    }
    
    res.redirect("/albums")
  }).catch((err) => {
    console.log(err)
    res.render('loginForm', {
      layout: 'main',
      errorMessage: "USER LOGIN FAILED: "+err
    })
  })
})

app.get('/news', async (req, res) => {
  // Declare an object to store properties for the view
  let viewData = {};
  try{
      // declare empty array to hold "news" objects
      let allnews = [];
      allnews = await newsService.getAllNews();
      // sort the news by newsDate
      allnews.sort((a,b) => new Date(b.newsDate) - new Date(a.newsDate));
      // get the latest news from the front of the list (element 0)
      let news = allnews[0]; 
      // store the "all news" and "news" data in the viewData object (to be passed to the view)
      viewData.allnews = allnews;
      viewData.news = news;

  }catch(err){
      viewData.message = 'no results';
  }
  // render the "news" view with all of the data (viewData)
  res.render('news', {data: viewData})
});

// Renders "Add news" view
//, ensureLogin
app.get('/news/add', (req,res) => {
  res.render('addNews')
});

//, ensureLogin
app.post('/news/add', upload.single('featureImage'), (req,res) => {
  if(req.file){
      let streamUpload = (req) => {
          return new Promise((resolve, reject) => {
              let stream = cloudinary.uploader.upload_stream(
                  (error, result) => {
                      if (result) {
                          resolve(result);
                      } else {
                          reject(error);
                      }
                  }
              );
  
  streamifier.createReadStream(req.file.buffer).pipe(stream);
          });
      };
  
      async function upload(req) {
          let result = await streamUpload(req);
          console.log(result);
          return result;
      }
  
      upload(req).then((uploaded)=>{
  processNews(uploaded.url);
      });
  }else{
  processNews("");
  }
  
  function processNews(imageUrl){
  req.body.featureImage = imageUrl;

  // Process the req.body and add it as a new News before redirecting to /news
  newsService.addNews(req.body).then(()=>res.redirect('/news'));
  }     
});

//Deletes news by ID
app.get('/news/delete/:id', ensureLogin, (req,res) => {
  newsService.deleteNewsById(req.params.id).then(()=>res.redirect('/news'))
  .catch((error) => res.status(500).send('Unable to Remove News / News not found'));
});


app.get("/loginHistory", ensureLogin, (req, res) => {
  res.render('loginHistory')
})

app.get("/logout", ensureLogin, (req,res) => {
  req.session.reset()
  res.redirect("/login")
})

app.use((req, res) => {
  res.render('404', {
    data: null,
    layout: 'main'
  })
})


musicService.initialize()
.then(userService.initialize())
.then(newsService.initialize())
.then(() => {
  app.listen(HTTP_PORT, onHttpStart)
}).catch((err) => {
  console.log(err)
})
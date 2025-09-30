//Libraries needed to handle HTTP requests and 
const express = require('express');
const axios = require('axios');
const path = require('path');

//Sets up express app and port to run on
const app = express();
const PORT = process.env.PORT || 3000;

//Uses EJs for viewing template, sends data per post request
app.set('view engine', 'ejs');
app.set('views', __dirname);
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Renders index.ejs file as homepage 
app.get('/', (req, res) => {
  res.render('index', { error: null });
});

// Reads the search and looks for it in API, sends results to the results.ejs, deals with errors at end
app.post('/search', async (req, res) => {
  try {
    const { queryType, term } = req.body;
    if (!term || term.trim() === '') {
      return res.render('index', { error: 'Please enter a search term.' });
    }

//Searching for drink name in the API, sends error if not found
    let apiUrl;
    if (queryType === 'name') {
      apiUrl = `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(term)}`;
      const response = await axios.get(apiUrl);
      const drinks = response.data.drinks; // 
      if (!drinks) return res.render('results', { drinks: [], message: `No cocktails found named "${term}".` });
      return res.render('results', { drinks, message: null });
    } else {

//Seach for ingredient in case drink name was not entered
      apiUrl = `https://www.thecocktaildb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(term)}`;
      const response = await axios.get(apiUrl);
      const list = response.data.drinks;
      if (!list) return res.render('results', { drinks: [], message: `No cocktails found with ingredient "${term}".` });

//Limits API returns for drink or ingredient and gets info on it from API
      const limit = 8;
      const selected = list.slice(0, limit);
      const detailsPromises = selected.map(item =>
        axios.get(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${item.idDrink}`)
      );
      const detailsResponses = await Promise.all(detailsPromises);
      const drinks = detailsResponses.map(r => r.data.drinks[0]);
      return res.render('results', { drinks, message: null });
    }

//Handeling API Error
  } catch (err) {
    console.error(err);
    return res.render('index', { error: 'Error fetching data from the API. Try again.' });
  }
});

// Selects a random cocktail for the random.ejs page
app.get('/random', async (req, res) => {
  try {
    const response = await axios.get('https://www.thecocktaildb.com/api/json/v1/1/random.php');
    const drink = response.data.drinks[0];
    res.render('random', { drink, error: null });
  } catch (err) {
    console.error(err);
    res.render('index', { error: 'Unable to fetch a random cocktail right now.' });
  }
});

// Gets the all information about the cocktail
app.get('/cocktail/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const response = await axios.get(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${id}`);
    const drink = response.data.drinks ? response.data.drinks[0] : null;
    if (!drink) return res.render('results', { drinks: [], message: 'Cocktail not found.' });
    res.render('detail', { drink });
  } catch (err) {
    console.error(err);
    res.render('results', { drinks: [], message: 'Error loading cocktail.' });
  }
});

// Gets 404 page if issue occurs
app.use((req, res) => {
  res.status(404).render('404');
});

//Starts the server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
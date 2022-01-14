const express = require('express');
const app = express();
const ejsMate = require('ejs-mate');
const path = require('path');
const herokuData = require('./public/json/heroku-data');
const methodOverride = require('method-override');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));


const recipesEndpoint = herokuData.recipes; // 'http://localhost:3001/recipes'
const specialsEndpoint = herokuData.specials; // 'http://localhost:3001/specials'

const formatDate = (date) => {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';

    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;

    const strTime = hours + ':' + minutes + ' ' + ampm;
    return (date.getMonth()+1) + "/" + date.getDate() + "/" + date.getFullYear() + "  " + strTime;
}

app.get('/', (req, res) => {
    res.redirect('/recipes');
})

app.get('/recipes', async (req, res) => {
    const fetchedRecipes = await fetch(recipesEndpoint);
    const recipes = await fetchedRecipes.json();
    res.locals.title = "Browse Recipes";
    res.render('recipes/index', { recipes });
})

app.post('/recipes', async (req, res) => {
    const recipe = req.body;

    recipe.uuid = uuidv4();
    recipe.servings = Number(recipe.servings);
    if(recipe.prepTime) {
        recipe.prepTime = Number(recipe.prepTime);
    }
    if(recipe.cookTime) {
        recipe.cookTime = Number(recipe.cookTime);
    }
    recipe.ingredients = recipe.ingredients.split("\n");
    recipe.directions = recipe.directions.split("\n");

    const date = new Date();
    const formattedDate = formatDate(date);
    recipe.postDate = formattedDate;
    recipe.editDate = formattedDate;

    fetch(recipesEndpoint, {
        method: 'POST',
        body: JSON.stringify(recipe),
        headers: { 'Content-Type': 'application/json' }
    })
        .then(res => res.json())

    res.redirect(`/recipes/${recipe.uuid}`);
})

app.get('/recipes/:id', async (req, res) => {
    const { id } = req.params;
    const fetchedRecipes = await fetch(recipesEndpoint);
    const recipes = await fetchedRecipes.json();

    const fetchedSpecials = await fetch(specialsEndpoint);
    const specials = await fetchedSpecials.json();

    recipes.forEach(recipe => {
        if(recipe.uuid === id) {

            recipe.ingredients.forEach(ingredient => {

                specials.forEach(special => {
                    if(ingredient.uuid === special.ingredientId) {
                        ingredient.specialTitle = special.title;
                        ingredient.specialType = special.type;
                        ingredient.specialText = special.text;
                    }
                })

            })
            res.locals.title = `${recipe.title} Recipe`;
            res.render('recipes/show', { recipe });
        }
    })
})

const updateRecipe = async (objArray, formData, id) => {
    let updatedRecipe = {};

    objArray.forEach(recipe => {
        if(recipe.uuid === id) {
            recipe.title = formData.title;
            recipe.description = formData.description;
            recipe.servings = Number(formData.servings);
            if(formData.prepTime) {
                recipe.prepTime = Number(formData.prepTime);
            }
            if(formData.cookTime) {
                recipe.cookTime = Number(formData.cookTime);
            }
            recipe.ingredients = formData.ingredients.split("\n");
            recipe.directions = formData.directions.split("\n");

            const date = new Date(),
                    formattedDate = formatDate(date);
            recipe.editDate = formattedDate;

            updatedRecipe = recipe;
        }
    })

    await fetch(`${recipesEndpoint}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedRecipe),
        headers: { 'Content-Type': 'application/json' }
    })
        .then(res => res.json())
        .catch(err => console.log(err));
}

app.put('/recipes/:id', async (req, res) => {
    const { id } = req.params;
    const recipeFormData = req.body;

    await fetch(recipesEndpoint)
        .then(res => res.json())
        .then(recipes => {
             updateRecipe(recipes, recipeFormData, id);
        })
        .catch(err => console.log(err))

    res.redirect(`/recipes/${id}`);
})

let port = process.env.PORT;
if(process.env.NODE_ENV !== 'production') {
    port = 3000;
}
    
app.listen(port, () => {
    console.log(`Serving on Port ${port}`);
})
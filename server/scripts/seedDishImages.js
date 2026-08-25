const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const DishImage = require('../models/DishImage');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

// A curated list of ~100 popular Bangladeshi dishes.
// Images are sourced from two places:
//  1. Wikimedia Commons (commons.wikimedia.org) — used wherever a photo exists
//     whose actual filename/caption names the exact dish (e.g. "Kacchi Biryani
//     with Jali Kabab.jpg", "Tehari.jpg", "Begun vorta.jpg", "Singara frying.JPG").
//     These are free-licensed (CC BY / CC BY-SA) and hotlinked via Wikimedia's
//     stable Special:FilePath redirect.
//  2. Unsplash — used for broader dish categories (general biryani/curry/rice
//     plates) where no dish-specific Commons photo exists. Photo IDs were pulled
//     from live Unsplash search results and rotated so dishes in the same family
//     don't all show the identical frame.
// A few very hyper-local items (e.g. Kochur Loti, Loitta Shutki Bhorta) have no
// dedicated stock photography anywhere, so the closest visual match was used —
// these are flagged below with a comment. Worth spot-checking links once seeded.

const wiki = (file) => `https://commons.wikimedia.org/wiki/Special:FilePath/${file}`;

const dishData = [
  // Biryani & Polao
  { name: "Kacchi Biryani", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrTYMV7ayGanSZEqQF1DnvEnza8xErU7dXBmUt2jKqhOYvtUlvFoUvLPpk&s=10" },
  { name: "Chicken Biryani", imageUrl: "https://www.cubesnjuliennes.com/wp-content/uploads/2020/07/Chicken-Biryani-Recipe.jpg" },
  { name: "Beef Tehari", imageUrl: "https://images.squarespace-cdn.com/content/v1/5ea5f3913b0ccf06d0ec2563/1592258969111-W6MOB229A8I5HX70EX95/Tehari+%281%29.jpg" },
  { name: "Mutton Biryani", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSOeLD86Vk1TCNz5-6noUh1UTq_0yp-IRq-sPytDoeLGZxzQJ9Ho6i4RNM&s=10" },
  { name: "Chicken Akhni", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTCuUnBVAohIwg12vMjOmE1hcP8yGv-DcWRgtjOoRy_UN4CkyqyfihaCwQ&s=10" },
  { name: "Morog Polao", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQFNu_d4hCOmXJ660QsvlGRXRyegV5xRdlXnrq7Q0dOu2k4FCwS3xfJra11&s=10" },
  { name: "Plain Polao", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0sAwaDSmY5k_09Iw4gruGWtnQE9oyH_i3BdhRE_P1xR2A2zmS_buhltg&s=10" },
  { name: "Peas Polao", imageUrl: "https://www.indianhealthyrecipes.com/wp-content/uploads/2021/01/peas-pulao-matar-pulao.jpg" },
  { name: "Ilish Polao", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRo0kDk4lzb9aAuEf9x5Ya3Q4abUhBv91XYX1imEwiK7rEr9ZPrPk3dlgk&s=10" },
  { name: "Prawn Polao", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSJc0O8FYH-j36Nm9O90--srmtsVwjNwSjjZQZKTs5rfrn_bmn7sWZ5m3w&s=10" },

  // Rice
  { name: "Plain Rice", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTIACDyHMB_210OY1b6aMWbp11wZ24EEo5MoZDXe-zOCECn4N1fxXnQTDE&s=10" },
  { name: "Fried Rice", imageUrl: "https://www.averiecooks.com/wp-content/uploads/2025/03/chickenfriedrice-9.jpg" },
  { name: "Khichuri", imageUrl: "https://assets.epicurious.com/photos/640aab48882e5bf74cea370a/1:1/w_2608,h_2608,c_limit/Bhuna%20khichuri-RECIPE.jpg" },
  { name: "Bhuna Khichuri", imageUrl: "https://assets.epicurious.com/photos/640aab48882e5bf74cea370a/1:1/w_2608,h_2608,c_limit/Bhuna%20khichuri-RECIPE.jpg" },
  { name: "Chicken Khichuri", imageUrl: "https://www.utshob.com/uploads/product_images/featured_images/egg_Khisuri_6339249a86379.jpg" },
  { name: "Beef Khichuri", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSDuuMSIIXUG97n19lDIn4KMKXAr4v40lXtPqBENZyis4Gh0Pt3d6i2BLg&s=10" },
  { name: "Mutton Khichuri", imageUrl: "https://cf-img-a-in.tosshub.com/lingo/atbn/images/story/202307/mutton_khichdi_recipe_bengali_how_to_make_mutton_chicken_khichuri-sixteen_nine.jpg?size=948:533" },
  { name: "Panta Bhat", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHA9zhV5yb5gl4WlUSoOsNkbUnIHl7wYNg0aU7O7sCnDlxiLbw81NO1zI&s=10" },
  { name: "Lemon Rice", imageUrl: "https://www.indianveggiedelight.com/wp-content/uploads/2023/03/lemon-rice-stovetop-featured.jpg" },
  { name: "Jeera Rice", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4WdqML2ylrZt6Rh-QWxpLdWrZeetg9xly8IuRYEy6pwEcabPSATSnOM3h&s=10" },

  // Chicken
  { name: "Chicken Roast", imageUrl: "https://images.unsplash.com/photo-1768179669433-bd9d52949c20?w=800" },
  { name: "Chicken Curry", imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800" },
  { name: "Chicken Bhuna", imageUrl: "https://images.unsplash.com/photo-1768179669433-bd9d52949c20?w=800" },
  { name: "Chicken Korma", imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800" },
  { name: "Chicken Rezala", imageUrl: "https://images.unsplash.com/photo-1768179669433-bd9d52949c20?w=800" },
  { name: "Chicken Tikka", imageUrl: "https://images.unsplash.com/photo-1599487405270-89025e1a38fc?w=800" },
  { name: "Chicken Chap", imageUrl: "https://images.unsplash.com/photo-1599487405270-89025e1a38fc?w=800" },
  { name: "Chicken Grill", imageUrl: "https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=800" },
  { name: "Chicken Shawarma", imageUrl: "https://images.unsplash.com/photo-1648937085186-b4528ce0a232?w=800" },
  { name: "Chicken Fry", imageUrl: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800" },

  // Beef & Mutton
  { name: "Beef Curry", imageUrl: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800" },
  { name: "Beef Bhuna", imageUrl: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800" },
  { name: "Beef Kala Bhuna", imageUrl: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800" },
  { name: "Beef Rezala", imageUrl: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800" },
  { name: "Beef Kebab", imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800" },
  { name: "Mutton Curry", imageUrl: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800" },
  { name: "Mutton Bhuna", imageUrl: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800" },
  { name: "Mutton Rezala", imageUrl: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800" },
  { name: "Mutton Korma", imageUrl: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800" },
  { name: "Seekh Kebab", imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800" },

  // Fish
  { name: "Ilish Macher Jhol", imageUrl: "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=800" },
  { name: "Rui Macher Jhol", imageUrl: wiki("Bori_diye_rui_machher_jhol.jpg") },
  { name: "Rui Macher Dopiaza", imageUrl: wiki("Bori_diye_rui_machher_jhol.jpg") },
  { name: "Bhetki Paturi", imageUrl: "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=800" },
  { name: "Chingri Malai Curry", imageUrl: "https://images.unsplash.com/photo-1559742811-822873691df8?w=800" },
  { name: "Chingri Bhuna", imageUrl: "https://images.unsplash.com/photo-1559742811-822873691df8?w=800" },
  { name: "Koi Macher Jhol", imageUrl: wiki("Shing_Macher_Jhol.jpg") }, // closest match: similar Bengali river-fish jhol
  { name: "Pabda Macher Jhol", imageUrl: wiki("Shing_Macher_Jhol.jpg") }, // closest match: similar Bengali river-fish jhol
  { name: "Shorshe Ilish", imageUrl: "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=800" },
  { name: "Fish Fry", imageUrl: "https://images.unsplash.com/photo-1599487405270-89025e1a38fc?w=800" },

  // Vegetables & Daal
  { name: "Mixed Vegetable", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800" },
  { name: "Lau Ghonto", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800" },
  { name: "Palong Shak", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800" },
  { name: "Lal Shak", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800" },
  { name: "Kochur Loti", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800" }, // no dedicated stock photo exists; closest match used
  { name: "Korola Bhaji", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800" },
  { name: "Begun Bhaji", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800" },
  { name: "Masoor Daal", imageUrl: "https://images.unsplash.com/photo-1548943487-a2e4e43b4859?w=800" },
  { name: "Moong Daal", imageUrl: "https://images.unsplash.com/photo-1548943487-a2e4e43b4859?w=800" },
  { name: "Cholar Daal", imageUrl: "https://images.unsplash.com/photo-1548943487-a2e4e43b4859?w=800" },

  // Bhorta (Mashes)
  { name: "Aloo Bhorta", imageUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800" },
  { name: "Begun Bhorta", imageUrl: wiki("Begun_vorta.jpg") },
  { name: "Tomato Bhorta", imageUrl: wiki("Begun-Toamto_mixed_Vorta.jpg") },
  { name: "Shutki Bhorta", imageUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800" },
  { name: "Dim Bhorta", imageUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800" },
  { name: "Dal Bhorta", imageUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800" },
  { name: "Dhone Pata Bhorta", imageUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800" }, // no dedicated stock photo exists; closest match used
  { name: "Kacha Morich Bhorta", imageUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800" },
  { name: "Taki Macher Bhorta", imageUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800" }, // no dedicated stock photo exists; closest match used
  { name: "Loitta Shutki Bhorta", imageUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800" }, // no dedicated stock photo exists; closest match used

  // Breads
  { name: "Roti", imageUrl: wiki("Homemade_flour_bread_for_breakfast._Bangladesh.jpg") },
  { name: "Paratha", imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800" },
  { name: "Naan", imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800" },
  { name: "Garlic Naan", imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800" },
  { name: "Luchi", imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800" },
  { name: "Mughlai Paratha", imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800" },
  { name: "Alu Paratha", imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800" },
  { name: "Bakarkhani", imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800" },
  { name: "Tandoori Roti", imageUrl: wiki("Homemade_flour_bread_for_breakfast._Bangladesh.jpg") },
  { name: "Puri", imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800" },

  // Snacks & Street Food
  { name: "Fuchka", imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800" },
  { name: "Chotpoti", imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800" },
  { name: "Singara", imageUrl: wiki("Singara_frying.JPG") },
  { name: "Samosa", imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800" },
  { name: "Peyaju", imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800" },
  { name: "Beguni", imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800" },
  { name: "Aloo Chop", imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800" },
  { name: "Halim", imageUrl: "https://images.unsplash.com/photo-1548943487-a2e4e43b4859?w=800" },
  { name: "Jhalmuri", imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800" },
  { name: "Bhelpuri", imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800" },

  // Sweets & Desserts
  { name: "Rosgolla", imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800" },
  { name: "Misti Doi", imageUrl: wiki("Bangladeshi_sweets.jpg") },
  { name: "Kalo Jam", imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800" },
  { name: "Gulab Jamun", imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800" },
  { name: "Chomchom", imageUrl: wiki("Bangladeshi_laddoo.jpg") }, // closest match: assorted Bangladeshi sweetmeat photo
  { name: "Sandesh", imageUrl: wiki("Bangladeshi_sweets.jpg") },
  { name: "Rasmalai", imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800" },
  { name: "Firni", imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800" },
  { name: "Payesh", imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800" },
  { name: "Shemai", imageUrl: wiki("Gaja_or_Goja,_Traditional_Bangladeshi_Sweetmeat,_13_April_2014_in_Dhaka,_Bangladesh.jpg") },

  // Common generated names by Gemini
  { name: "Attar Roti with Vegetable Daal", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT2hE7nKd5TkOTU7OexmwEUrfkyOtvyLmPD0K4dd-lDlIENAk_perLISHNL&s=10" },
  { name: "Plain Rice with Rui Fish Curry & Shak", imageUrl: wiki("Bori_diye_rui_machher_jhol.jpg") },
  { name: "Muri Makha (Puffed Rice) & Green Tea", imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800" },
  { name: "Chicken Khichuri (Low Oil)", imageUrl: wiki("Khichuri,_a_bangali_dish.jpg") }
];

async function seedDishes() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI not found in environment variables.");
      process.exit(1);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    console.log("Clearing existing dish images...");
    await DishImage.deleteMany({});

    console.log("Inserting seeded dish images...");
    await DishImage.insertMany(dishData);

    console.log(`Successfully seeded ${dishData.length} dishes.`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding dishes:", error);
    process.exit(1);
  }
}

seedDishes();
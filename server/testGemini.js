const dotenv = require('dotenv');
dotenv.config();

const { estimateCaloriesFromText } = require('./services/calorieApiService');

estimateCaloriesFromText('salad', '1 large plate')
  .then(res => console.log('SUCCESS:', res))
  .catch(err => {
    console.error('FAILED ERROR OBJECT:', err);
    if (err.response) {
      console.error('RESPONSE DATA:', err.response.data);
    }
  });

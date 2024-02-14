const properties = require("./json/properties.json");
const users = require("./json/users.json");


// code to connect to database
const { Pool } = require('pg');
const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool
    .query(`SELECT * FROM users WHERE email = $1`, [email])
    .then((result) => {
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool
  .query(`SELECT * FROM users WHERE id = $1`, [id])
  .then((result) => {
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows;
  })
  .catch((err) => {
    console.log(err.message);
  });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  return pool
    .query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *`, [user.name, user.email, user.password])
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  return pool
    .query(`SELECT reservations.id, title, cost_per_night, start_date, properties.*, AVG(rating) AS average_rating
            FROM reservations
            JOIN properties ON properties.id = reservations.property_id
            JOIN property_reviews ON property_reviews.property_id = properties.id
            WHERE reservations.guest_id = $1
            GROUP BY reservations.id, properties.id
            ORDER BY start_date
            LIMIT $2;`,
            [guest_id, limit])
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {
    const queryParams = [];
    // construct the query that are fixed
    let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_id
    `;

     // Construct the WHERE clause based on the provided options
     const filters = [];
     if (options.owner_id) {
       queryParams.push(options.owner_id);
       filters.push(`properties.owner_id = $${queryParams.length}`);
     }
     if (options.city) {
      queryParams.push(`%${options.city}%`);
      filters.push(`properties.city LIKE $${queryParams.length} `);
    }
     if (options.minimum_price_per_night && options.maximum_price_per_night) {
       queryParams.push(options.minimum_price_per_night * 100); // Convert to cents
       queryParams.push(options.maximum_price_per_night * 100); 
       filters.push(`properties.cost_per_night BETWEEN $${queryParams.length - 1} AND $${queryParams.length}`);
     } else if (options.minimum_price_per_night) {
       queryParams.push(options.minimum_price_per_night * 100); 
       filters.push(`properties.cost_per_night >= $${queryParams.length}`);
     } else if (options.maximum_price_per_night) {
       queryParams.push(options.maximum_price_per_night * 100); 
       filters.push(`properties.cost_per_night <= $${queryParams.length}`);
     }
  
     // Add the WHERE clause if filter options exist
     if (filters.length > 0) {
       queryString += `WHERE ${filters.join(' AND ')} `;
     }

     // Add the HAVING clause if ratings are passed in
     if (options.minimum_rating) {
      queryParams.push(options.minimum_rating);
      queryString += `GROUP BY properties.id HAVING avg(property_reviews.rating) >= $${queryParams.length}`;
    } else { // if no ratings, just regular group by
      queryString += `GROUP BY properties.id`;
    }

    // Add any query that comes after the where clause
    queryParams.push(limit);
    queryString += `
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;
  
    return pool.query(queryString, queryParams)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  return pool
  .query(`INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, parking_spaces,
          number_of_bathrooms, number_of_bedrooms, country, street, city, province, post_code, active) VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`, 
           [property.owner_id, property.title, property.description, property.thumbnail_photo_url, property.cover_photo_url, property.cost_per_night, 
            property.parking_spaces, property.number_of_bathrooms, property.number_of_bedrooms, property.country, property.street, property.city,
            property.province, property.post_code, true])
  .then((result) => {
    return result.rows;
  })
  .catch((err) => {
    console.log(err.message);
  });
   
};



(1, 'Speed lamp', 'description', 'https://images.pexels.com/photos/2086676/pexels-photo-2086676.jpeg?auto=compress&cs=tinysrgb&h=350', 'https://images.pexels.com/photos/2086676/pexels-photo-2086676.jpeg', 93061, 6, 4, 8, 'Canada', '536 Namsub Highway', 'Sotboske', 'Quebec', 28142, true),


module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};

// ✅ Modified index.js for Aiven MySQL with working user register/login, products, relatedproducts, and cart en clsdpoints
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const app = express();
const PORT = 5000;

const storage = multer.memoryStorage(); // stores files in memory as Buffer
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: 'mysql-2ebaaef9-ecommerce-construction-1.c.aivencloud.com',
  user: 'avnadmin',
  password: 'AVNS_LDkcNv993LfkzZNEvkR',
  database: 'defaultdb', 
  port: 23012,
  connectTimeout: 10000 // optional, but helpful
});

db.connect(err => {
  if (err) {
    console.error('MySQL connection failed:', err);
    return;
  }
  console.log('✅ Connected to Aiven MySQL');
});

// ------------------ User Register/Login ------------------

app.get('/users', (req, res) => {
  db.query('SELECT * FROM user_details', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  db.query(
    'SELECT username, phone FROM user_details WHERE id = ?',
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      if (results.length === 0) return res.status(404).json({ error: 'User not found' });
      res.json(results[0]);
    }
  );
});

// Add User
app.post('/users', (req, res) => {
  const { username, phone } = req.body;

  db.query(
    'INSERT INTO user_details (username, phone) VALUES (?, ?)',
    [username, phone],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ success: true });
    }
  );
});


// Update User
app.put('/users/:id', (req, res) => {
  const { username, phone } = req.body;

  db.query(
    'UPDATE user_details SET username = ?, phone = ? WHERE id = ?',
    [username, phone, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ success: true });
    }
  );
});


app.delete('/users/:id', (req, res) => {
  db.query('DELETE FROM user_details WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'User deleted successfully' });
  });
});

app.post('/register', (req, res) => {
  const { username, password, phone } = req.body;
  db.query(
    'INSERT INTO user_details (username, password, phone) VALUES (?, ?, ?)',
    [username, password, phone],
    err => {
      if (err) return res.status(500).json({ message: 'Error registering user', error: err });
      res.status(200).json({ message: 'User registered successfully' });
    }
  );
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.query(
    'SELECT * FROM user_details WHERE username = ? AND password = ?',
    [username, password],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Login error', error: err });
      if (results.length > 0) {
        const user = results[0];
        return res.status(200).json({
          message: 'Login successful',
          user_id: user.id,
          username: user.username,
          phone: user.phone,
        });
      } else {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    }
  );
});

// ------------------ Products ------------------
app.get('/products', (req, res) => {
  db.query('SELECT id, name, image FROM products', (err, results) => {
    if (err) return res.status(500).json({ error: err });

    const products = results.map(row => ({
      id: row.id,
      name: row.name,
      imageUrl: row.image
        ? `data:image/jpeg;base64,${row.image.toString('base64')}`
        : '',
    }));

    res.json(products);
  });
});



app.post('/products', upload.single('image'), (req, res) => {
  const { name, image } = req.body;

  // Decode base64 to buffer
  const imageBuffer = Buffer.from(image, 'base64');

  db.query('INSERT INTO products (name, image) VALUES (?, ?)', [name, imageBuffer], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Product added successfully' });
  });
});


app.put('/products/:id', (req, res) => {
  const { name, image } = req.body;

  const imageBuffer = image ? Buffer.from(image, 'base64') : null;

  db.query('UPDATE products SET name = ?, image = ? WHERE id = ?', [name, imageBuffer, req.params.id], err => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

app.delete('/products/:id', (req, res) => {
  db.query('DELETE FROM products WHERE id = ?', [req.params.id], err => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

// ------------------ Related Products ------------------
app.get('/relatedproducts/:productid', (req, res) => {
  const parentId = req.params.productid;
  db.query(
    `SELECT rp.*, p.name as parent_name 
     FROM relatedproducts rp 
     LEFT JOIN products p ON rp.product_id = p.id 
     WHERE rp.product_id = ?`,
    [parentId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      // console.log('Fetched Related Products:', results);

      const updatedResults = results.map(row => ({
        ...row,
        imageUrl: row.image ? `data:image/jpeg;base64,${row.image.toString('base64')}` : '',
      }));

      res.json(updatedResults);
    }
  );
});

app.get('/relatedproducts', (req, res) => {
  db.query('SELECT * FROM relatedproducts', (err, results) => {
    if (err) return res.status(500).json({ error: err });

    const updatedResults = results.map(row => ({
      ...row,
      imageUrl: row.image ? `data:image/jpeg;base64,${row.image.toString('base64')}` : '',
    }));

    res.json(updatedResults);
  });
});



// Insert
app.post('/relatedproducts', (req, res) => {
  const { name, image, product_id } = req.body;

  const imageBuffer = image ? Buffer.from(image, 'base64') : null;

  db.query(
    'INSERT INTO relatedproducts (name, image, product_id) VALUES (?, ?, ?)',
    [name, imageBuffer, product_id],
    err => {
      if (err) return res.status(500).json({ error: err });
      res.json({ success: true });
    }
  );
});


// Update
app.put('/relatedproducts/:id', (req, res) => {
  const { name, image, product_id } = req.body;

  const imageBuffer = image ? Buffer.from(image, 'base64') : null;

  db.query(
    'UPDATE relatedproducts SET name = ?, image = ?, product_id = ? WHERE id = ?',
    [name, imageBuffer, product_id, req.params.id],
    err => {
      if (err) return res.status(500).json({ error: err });
      res.json({ success: true });
    }
  );
});



app.delete('/relatedproducts/:id', (req, res) => {
  db.query('DELETE FROM relatedproducts WHERE id = ?', [req.params.id], err => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

//----------------user Request---------------------
app.get('/requests', (req, res) => {
  db.query('SELECT * FROM user_request', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});


app.post('/requests', (req, res) => {
  const { user_id, username, phone, product, quantity } = req.body;

  if (!user_id || !username || !phone || !product || !quantity) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const sql = 'INSERT INTO user_request (user_id, username, phone, product, quantity) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [user_id, username, phone, product, quantity], (err, results) => {
    if (err) {
      console.error('Error inserting request:', err);
      return res.status(500).json({ message: 'Failed to store request' });
    }

    res.status(200).json({ message: 'Request stored successfully' });
  });
});

app.delete('/requests/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'DELETE FROM user_request WHERE id = ?';

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error deleting request:', err);
      return res.status(500).json({ message: 'Failed to delete request' });
    }

    res.status(200).json({ message: 'Request deleted successfully' });
  });
});


// ------------------ Cart ------------------
app.post('/add-to-cart', (req, res) => {
  const { userId, productId, productName, quantity, image } = req.body;
  const imageBuffer = image?.includes(',') ? Buffer.from(image.split(',')[1], 'base64') : null;
  const query = 'INSERT INTO user_cart (user_id, product_id, product_name, quantity, image) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [userId, productId, productName, quantity, imageBuffer], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Item added to cart' });
  });
});

app.get('/cart/:userId', (req, res) => {
  const { userId } = req.params;
  db.query('SELECT id, product_id, product_name, quantity, image FROM user_cart WHERE user_id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    const cart = results.map(row => ({
      id: row.id,
      productId: row.product_id,
      name: row.product_name,
      quantity: row.quantity,
      imageUrl: row.image ? `data:image/jpeg;base64,${row.image.toString('base64')}` : '',
    }));
    res.json(cart);
  });
});

app.put('/cart/:userId/:productId', (req, res) => {
  const { userId, productId } = req.params;
  const { quantity } = req.body;
  db.query('UPDATE user_cart SET quantity = ? WHERE user_id = ? AND product_id = ?', [quantity, userId, productId], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Quantity updated' });
  });
});

app.delete('/cart/:userId/:productId', (req, res) => {
  const { userId, productId } = req.params;
  db.query('DELETE FROM user_cart WHERE user_id = ? AND product_id = ?', [userId, productId], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Item removed from cart' });
  });
});

// ------------------ Start Server ------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

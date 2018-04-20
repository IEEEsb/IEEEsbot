const fs = require('fs'),
      rp = require('request-promise');


const { CredentialsError, InsufficientFundsError,
        UnknownInventoryItemError } = require('./errors');

const config = JSON.parse(fs.readFileSync('./config.json'));
const API_ROOT = config.apiRoot;


module.exports.loginQuery = (alias, pass) => {
    // POST /api/users/login with the following x-www-form-urlencoded params:
    //   - alias
    //   - password
    const formData = {
        alias: alias,
        password: pass,
    };

    const cookieJar = rp.jar();

    return rp.post(`${API_ROOT}/users/login`,
        { form: formData, jar: cookieJar })
        .then(res => {
            const token = cookieJar.getCookies(API_ROOT)
                .filter(obj => obj.key === 'auth')[0].value;

            return {
                fullUser: JSON.parse(res),
                token: token,
            };
        })
        .catch(err => {
            // There is no error message, hence there has been some problem
            // not related to the login itself (e.g. a connection problem)
            if (!err.error) throw err;

            // Check if the server complained about an incorrect user/pass
            const error = JSON.parse(err.error);

            if (error.message === 'Alias not found' ||
                error.message === 'Incorrect password') {
                throw new CredentialsError();
            }

            // Not a login-related problem either, but returned by the API in
            // this case
            throw err;
        });
};

module.exports.fetchProductById = (productId, token) => {
    const cookieJar = rp.jar();
    cookieJar.setCookie(`auth=${token}`, API_ROOT);
    
    return rp.get(`${API_ROOT}/inventory/${productId}`, { jar: cookieJar })
        .then(res => {
            if (!res) throw new UnknownInventoryItemError();

            return JSON.parse(res);
        });
};

module.exports.fetchProducts = (page, pageSize, token) => {
    pageSize = pageSize || 5;

    const queryString = {
        pagesize: pageSize,
        page: page,
    };

    const cookieJar = rp.jar();
    cookieJar.setCookie(`auth=${token}`, API_ROOT);

    return rp.get(`${API_ROOT}/inventory/all`,
        { qs: queryString, jar: cookieJar })
        .then(res => {
            return JSON.parse(res);
        });
};

module.exports.makePurchase = (productId, amount, token) => {
    const formData = {
        item: productId,
        quantity: amount,
    };

    const cookieJar = rp.jar();
    cookieJar.setCookie(`auth=${token}`, API_ROOT);

    return rp.post(`${API_ROOT}/inventory/buy`,
        { form: formData, jar: cookieJar })
        .then(res => {
            return JSON.parse(res);
        })
        .catch(err => {
            if(err.message.includes('Cast to ObjectId failed'))
                throw new UnknownInventoryItemError();

            if (!err.error) throw err;

            const error = JSON.parse(err.error);

            if (error.message === 'Low values') {
                throw new InsufficientFundsError();
            } else if (error.message === 'Invalid values') {
                throw new UnknownInventoryItemError();
            }

            throw err;
        });
};

module.exports.CredentialsError = class extends Error {};

module.exports.ApiError = class extends Error {};

module.exports.InsufficientFundsError = class extends Error {
    constructor(...args) {
        super(...args);
        this.message = 'This user doesn\'t have enough funds to make the ' +
            'requested purchase';
    }
};

module.exports.UnknownInventoryItemError = class extends Error {
    constructor(...args) {
        super(...args);
        this.message = 'The specified product ID doesn\'t match any item ' +
            'in the inventory';
    }
};

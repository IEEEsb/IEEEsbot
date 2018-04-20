const fs           = require('fs'),
      path         = require('path'),
      Telegraf     = require('telegraf'),
      Telegram     = require('telegraf/telegram'),
      Stage        = require('telegraf/stage'),
      LocalSession = require('telegraf-session-local'),
      i18n         = require('i18n'),
      { __ }       = i18n;

// Read the config file
const config = JSON.parse(fs.readFileSync('./config.json'));

const { loginWizard } 				= require('./loginWizard');
const { fetchProducts, fetchProductById,
        makePurchase } 				= require('./ieeesbApi');
const { formatProductMsg, isLoggedIn, navKeyboard,
        updateProdList } 			= require('./util');
const { InsufficientFundsError,
        UnknownInventoryItemError } = require('./errors');

// Initialize i18n
i18n.configure({
    directory: path.join(__dirname, '../locales'),
    updateFiles: true,
    syncFiles: true,
    defaultLocale: config.locale,
});

const bot = new Telegraf(config.telegram.token);
const telegram = new Telegram(config.telegram.token);

// Use permanent data store
const localSession = new LocalSession({
    database: path.join(__dirname, '../store.json')
});
bot.use(localSession).middleware();

// Stages are the different "status" the bot can be in. For now it's only has
// the login phase (i.e. the wizard)
const stage = new Stage([loginWizard]);
bot.use(stage.middleware());

// Handles: /start
bot.start(async ctx => {
    if (!ctx.session.user || !ctx.session.user.token) {
        await ctx.reply(__('Hi! I\'m @{{botName}}',
            { botName: config.telegram.botName }));
        await ctx.reply(__('Before we begin, I need you to log in.'));
        ctx.session.user = {};  // Initialize the user object in the store
        ctx.scene.enter('loginWizard');
    } else {
        const firstName = ctx.session.user.name.split(' ')[0];
        await ctx.reply(__('Haven\'t we already met, {{firstName}}? 🤔',
            { firstName: firstName }));
        }
});

// Handles: /help
bot.help(ctx => {
    return ctx.reply(__('/start - Log in with your credentials.\n' +
        '/buy - Show items in the inventory available for buying.\n' +
        '/help - Display this help message.'));
});

// Handles: /buy
bot.command('buy', isLoggedIn, async ctx => {
    ctx.session.count = 1;

    await fetchProducts(ctx.session.count, config.pageSize,
        ctx.session.user.token)
        .then(prods => {
            return ctx.reply(formatProductMsg(prods), navKeyboard);
        });
});

// Handles: /buy_*
bot.hears(/\/buy_\w+/, isLoggedIn, async ctx => {
    const productId = ctx.match[0].slice(5);  // Remove the "/buy_"

    await makePurchase(productId, 1, ctx.session.user.token)
        .then(() => {
            // Get the product's name
            return fetchProductById(productId, ctx.session.user.token);
        })
        .then(prod => {
            ctx.replyWithMarkdown(__('You have bought *1* {{prod.name}} ' +
                'for *${{prod.sellPrice}}*', { prod: prod }));
        })
        .catch(err => {
            if (err instanceof InsufficientFundsError) {
                return ctx.reply(__('You don\'t have enough funds to ' +
                    'purchase that'));
            } else if (err instanceof UnknownInventoryItemError) {
                return ctx.reply(__('There are no products with such ID'));
            }
            ctx.replyWithMarkdown(__('Something went wrong with the ' +
                'purchase (`{{err}}`)', { err: err }));
        });
});

// Handles any other unknown text message or command
bot.on('text', isLoggedIn, ctx => {
    return ctx.reply(__('I don\'t understand that. Try with /help.'));
});

// Handles when the "«" button is hit in the "/buy" reply
bot.action('back', isLoggedIn, async ctx => {
    if (ctx.session.count > 1) {
        ctx.session.count--;

        await fetchProducts(ctx.session.count, config.pageSize,
            ctx.session.user.token)
            .then(async prods => {
                if (prods.length) await updateProdList(ctx, prods, telegram);
            });
    }
    return ctx.telegram.answerCbQuery(ctx.callbackQuery.id);
});

// Handles when the "»" button is hit in the "/buy" reply
bot.action('next', isLoggedIn, async ctx => {
    ctx.session.count++;

    await fetchProducts(ctx.session.count, config.pageSize,
        ctx.session.user.token)
        .then(async prods => {
            if (prods.length) {
                await updateProdList(ctx, prods, telegram);
            } else {
                ctx.session.count--;
            }
        });
    return ctx.telegram.answerCbQuery(ctx.callbackQuery.id);
});

// Start the bot itself, using webhooks or polling (depending on the config)
const updatesConf = config.telegram.updates;
const httpsConf = (updatesConf.https) ? {
	key: fs.readFileSync(updatesConf.https.key),
	cert: fs.readFileSync(updatesConf.https.cert),
	ca: (updatesConf.https.ca) ?
		fs.readFileSync(updatesConf.https.ca) : undefined,
} : null;

if (updatesConf.type === 'webhook') {
	bot.telegram.setWebhook(updatesConf.url);
	bot.startWebhook(updatesConf.localPath, httpsConf, updatesConf.localPort);
} else {
	bot.startPolling();
}

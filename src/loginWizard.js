const crypto      = require('crypto'),
      Composer    = require('telegraf/composer'),
      WizardScene = require('telegraf/scenes/wizard'),
      { __ }      = require('i18n');

const { loginQuery } = require('./ieeesbApi');
const { CredentialsError } = require('./errors');

const userHandler = new Composer();
userHandler.on('text', ctx => {
    ctx.session.user.alias = ctx.message.text;

    ctx.replyWithMarkdown(__('Okay, and what\'s your *password*?'));
    return ctx.wizard.next();
});
userHandler.on('message', ctx =>
    ctx.replyWithMarkdown(__('The password has to be *text*')));

const passHandler = new Composer();
passHandler.on('text', async ctx => {
    // The API doesn't read the password, but its SHA256 hash
    const password = crypto.createHash('sha256').update(ctx.message.text)
        .digest('hex');

    await ctx.reply(__('Logging in...'));
    await ctx.reply(__('Meanwhile, I recommend you to delete the messages ' +
        'with your credentials or use the "Clear history" button in the '+
        'chat\'s menu, for the sake of security'));

    try {
        const { fullUser, token } = await loginQuery(ctx.session.user.alias,
            password);
    
        // Everything went okay. Store user's info in the permanent store
        ctx.session.user.name = fullUser.name;
        ctx.session.user.token = token;
    } catch(e) {
        if (e instanceof CredentialsError) {  // Incorrect user/pass
            await ctx.replyWithMarkdown(__('Error! *Wrong credentials*'));
            await ctx.replyWithMarkdown(__('What was your *username*?'));
            return ctx.wizard.selectStep(1);
        }

        // Some unknown error
        ctx.replyWithMarkdown(__('Error logging in (`{{e}}`).', { e: e }));
        return ctx.scene.leave();
    }
    
    // Let the user know about the successful login attempt and quit the
    // wizard
    ctx.reply(__('You have successfully logged in! Use /buy to make your ' +
        'first purchase'));

    return ctx.scene.leave();
});
passHandler.on('message', ctx => ctx.reply(__('Not a valid password!')));


module.exports.loginWizard = new WizardScene('loginWizard',
    ctx => {
        ctx.replyWithMarkdown(__('What\'s your *username*?'));
        return ctx.wizard.next();
    },
    userHandler,
    passHandler,
);

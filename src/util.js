const Markup = require('telegraf/markup'),
      { __ } = require('i18n');


module.exports.formatProductMsg = (prods) => {
    let msg = '';

    prods.map(prod => {
        msg += __('{{prod.name}} (/buy_{{prod._id}})\n' +
            '{{prod.quantity}} unit(s)\n' +
            '${{prod.sellPrice}} per unit\n\n', { prod: prod });
    });

    return msg;
};

module.exports.isLoggedIn = (ctx, next) => {
    if(ctx.session.user !== undefined &&
        ctx.session.user.token !== undefined) {
        return next(ctx);
    }

    if (ctx.callbackQuery) ctx.telegram.answerCbQuery(ctx.callbackQuery.id);
    return ctx.reply(__('Hold on, you have to log in first. Use /start.'));

};

module.exports.updateProdList = (ctx, prods, telegram) => {
    let msg = module.exports.formatProductMsg(prods);

    // ID of the message where the clicked button is located
    let source_id = ctx.update.callback_query.message.message_id;
    let chat_id = ctx.update.callback_query.message.chat.id;

    return telegram.editMessageText(chat_id, source_id, null, msg,
        module.exports.navKeyboard);
};

const backButton = Markup.callbackButton('«', 'back');
const nextButton = Markup.callbackButton('»', 'next');

module.exports.navKeyboard = Markup.inlineKeyboard([
    [ backButton, nextButton ]
]).extra();

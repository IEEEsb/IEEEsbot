IEEEsbot
========

IEEEsbot is the Telegram bot we use at our student branch to purchase items
in the branch's inventory through
[the API](https://github.com/Repo-IEEEsb/Web-IEEEsb-backend).

# Installation

For using IEEEsbot, [Node.js](https://nodejs.org) 8.11 or higher is required.
It may work with previous versions, but support is not guaranteed.

Clone or download the project, and copy the example config file:

    $ cp config.json.example config.json

Then customize it to fit your needs. You can see detailed instructions on how
to do it in the [Configuration](#configuration) section.

Once that's sorted out, run the following in the project's root:

    $ npm install
    $ npm start


# Configuration

All the system-specific setup for IEEEsbot is configured ìn the `config.json`
file. It looks like this:

```json
{
    "telegram": {
        "token": "<your_bot's_telegram_token>",
        "botName": "<your_bot's_username_without_at>",
        "updates": {
            "type": "webhook",
            "url": "<webhook_path_in_the_bot's_host>",
            "localPath": "<local_path_where_the_webhook_listens>",
            "localPort": 8443,
            "https": {
                "key": "<some/path/to/key.pem>",
                "cert": "<some/path/to/cert.pem>",
                "ca": "<some/path/to/ca.pem>"
            }
        }
    },
    "pageSize": 3,
    "locale": "<your_locale>",
    "apiRoot": "<where_the_backend's_api_is>"
}
```

`pageSize` is the amount of items shown per message when `/buy` is used.

Please note that **all fields are required**, unless stated otherwise.

## The `updates` field

The `updates` field can have two different values, depending on whether you
want to use polling or webhooks to communicate with Telegram's server.

### Polling

With polling, the bot will periodically contact Telegram's servers to check
if new messages have been received. This method makes the bot a bit slower to
response and it's slightly network-intensive.

However, it has the benefit of an easier setup (especially if the bot's host
cannot be reached from the internet for some reason).

```json
"updates": {
    "type": "polling"
}
``` 


### Webhooks

With a webhook, the Telegram servers will contact the bot for every new update
(i.e. when a message is received). This makes the bot faster, but requires
setting up an HTTPS server to be able to accept the requests.

IEEEsbot will create the server for you, but some additional information is
required.

```json
"updates": {
    "type": "webhook",
    "url": "<webhook_path_in_the_bot's_host>",
    "localPath": "<local_path_where_the_webhook_listens>",
    "localPort": 8443,
    "https": {
        "key": "<some/path/to/key.pem>",
        "cert": "<some/path/to/cert.pem>",
        "ca": "<some/path/to/ca.pem>"
    }
}
```

`localPath` and `localPort` indicate where the bot should listen for updates.
This may or may not be the same as the one specified in the host's URL,
depending on your specific network setup.

The `https` field is used for specifying where the different SSL/TLS keys can
be found in the local filesystem, although you can skip it if you have some
other service that manages HTTPS between the webhook and the bot (e.g. nginx).
If you don't have an SSL/TLS certificate,
you may be interested in [Let's Encrypt](https://letsencrypt.org)
(recommended) or creating a
[self-signed](https://en.wikipedia.org/wiki/Self-signed_certificate) one.

The `ca` field is optional, it's only required if you're using self-signed
certs.

# Localization

This bot supports displaying all messages in your own language. It is in
English by default, and for now it has also been tranlated to Spanish.

However, if you want to have it in some other language, you can make a copy of
the `locales/en.json` file and translate the keys as you need:

```json
{
    "hello": "hola",
    "some key": "some translation",
    "...": "..."
}
```

Don't forget to change the `locale` setting in the `config.json` file to fit
your new language. For example, if you named your translation `DE_de.json`,
then set `"locale": "DE_de"`.

Please file a [pull request](https://github.com/Repo-IEEEsb/IEEEsbot/pulls)
with the new language if you make a new translation!

# License

This code is licensed under the MIT license. More in the [LICENSE](./LICENSE)
file.

---

(c) 2018 Rama Universitaria del IEEE de Madrid - All rights reserved

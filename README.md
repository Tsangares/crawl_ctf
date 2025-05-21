# Quickstart

This is a flask web server that does both frond and backend.

The purpose of this project is to provide a few simple web-crawling activities that is common when data-mining. This should help people in this skills to learn to make bots. Additionally, there is a competative multiplayer component to allow players to engage with one another. 

Please just jump right into the loginless demo website over at https://ctf.gradstudent.me


## Install dependencies

Make a virtualenv currently using python 3.13

    python -m virtualenv env
n
Then install the package requirements

    pip install -r requirements


## Setup MongoDB

Instal mongodb and setup an account with credentials with `readWrite` access to a DB.

## Setup `config.py`

Instead of using a `.env` for this project we tried out `config.json`, very similar. Setup a `config.json` in the root directory with the following schema:

```
{
    "MONGO_URI": "mongodb://USERNAME:PASSWORD:27017/ctf?authSource=test",
    "secret": "MAKEANEWSECRET"
}
```

## Running

Simply run,

    python app.py

To get it running on the interface `0.0.0.0`. Otherwise there is a supplied systemd service file example. You can also setup gunicorn to run the app.

Once you have MongoDB working and the python server running, the whole thing should simply work with paswordless logins.

# How do logins work?

There is no password. The login is based on a useragent fingerpring and public ip. So the user agent and ip are hashed together to create a password. Each person can then many name number of Usernames they want, to create multiple accounts. This is a simple way to enable people to simply get started. Its vulnerable to botting but throttling is enabled. 
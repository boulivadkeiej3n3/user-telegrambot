
# Food Delivery Online System(like Über eats) | Telegram Bot




# Overview

This is a Telegram Bot Food Delivery System that has the same workflow of Über eats, connecting Clients who can view the Menu, and order food from different listed restaurants and Restaurant Managers.



# Project File Structure
**main.js** The main Node.js files that is responsible for *Handling User Input*, *Read/Write to the Backend server*, and *Changing the UI Components on Telegram*

**liveServer.js** The Backend Server Code responsible for *Storing User Data on MongoDB*, *Registering New Clients and Restaurants*, *Handling orders for Clients*,...etc.

**nextStepList.json** is an Object that describes the response for each command sent by the user and every button clicked as a List of nested Objects that are executed by the code as one block.

# Workflow (Technical) 
## User Side:
 The bot is hosted on a Node.js server communicating with users via the Telegram API (HTTP). When the user, customer or a restaurant manager, starts a chat with the bot via the `/start` command the bot searches the `nextStepList.json` for the **Prompt (The text and options the user is going to see)** and **Handler(s) ( These are functions that determine how the output is changed based on variables passed to it as well as how it handles the client's response/chosen-option)** associated with that command and executes.
Any time a User chooses an option or writes a command, with or without arguments, the code looks up `nextStepList.json` for the associated block with this command. If the command passed by the user to the bot doesn't exist, invalid arguments have been passed, then a fallback error Block will be executed that can be `/error`,`/command_error`, `/under_construction`, or  `/default` depending on the context.


**Handlers**  inside each command block of the `nextStepList` have the ability to pause the execution for a finite duration of time, then execute some code or give control back to the User.

A Customer can view the menus of the *Nearby Opened Restaurants* and order food by navigating through the buttons on the *Customer Dash*. The current location (Area)  of the customer is dependent on the given Area code upon registration.

When the bot `/start`s, an automatic login happens by matching the Telegrams User ID with the stored User Data on MongoDB. If the user doesn't exist, then the`/register` process begins automatically, and the code block executes.

# Technologies Used 

**Node.js** As the main Runtime Environment.
**Node Telegram API** As a Node.js wrapper to the raw HTTP Telegram API for easier communication
**Axios** To send/receive HTTP requests with the Backend Server(mostly) or to communicate with the Telegram API when *Node Telegram API* doesn't support an operation.
**MongoDB** As A Database System for storing and fetching data about Users, Restaurants, Menus... And other entities
node-telegram-bot-api

## Notes
*This is an unfinished project. Only 10% is finished*

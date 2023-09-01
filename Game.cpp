#include "Game.h"
#include "funcs.h"
#include <string>
#include <filesystem>
#include <limits>
#include <dirent.h>
// namespace filesystem {}
// using namespace filesystem;
// #include <experimental/filesystem>
// namespace fs = std::experimental::filesystem;


// Included to be able to use the usleep() function to pause our program for animation
#include <unistd.h>
#include <stdio.h>

Game::Game() {
    info = "  \n  ";
    action = "  ";
    yesno[0] = "Yes";
    yesno[1] = "No";
    int choice = 1;
    while (true) {
        int option = 1;
        while(true) {
            system("clear");
            string list[3] = {"Load Game","New Game","Terminate Program"};
            cout << menuBox(choiceList(list,3,option),0);
            int choice = cursorInput(3,option,"vert");
            if(choice == option) {
                break;
            }
            option = choice;
        }
        if(option == 3) {
            system("clear");
            exit(0);
        }
        else if(option == 1) {
            loadGame();
            if(player.getName() != "") {
                break;
            }
        }
        else {
            level_ = 0;
            money_  = 6050;
            checkpoint_ = 0;
            usa = Map("usa");
            europe = Map("europe");
            map_ = usa;
            readRaces("./races.txt");
            break;
        }
    }
}

bool Game::levelUP() {
    if(level_ < 6 || map_.getRaceCount() == 0) {
        level_++;
    }
    bikeshop_.changeMultiplier(level_);
    return true;
}
void Game::initializeMaps() {
    usa = Map("usa");
    europe = Map("europe");
}

int Game::setPlayerName(string input) {
    player.setName(input);
    return 0;
}

void Game::gameWindow(string display) {
    system("clear");
    cout << menuBox(printStatus(player) + " \n \n  \n" + info + "\n  \n \n" + action + " \n \n" + display,1);
    // info = "  \n  ";
}

void Game::setInfo(string input) {
    info = input;
}

Racer Game::getPlayer() {
    return player;
}

string Game::printStatus(Racer racer) {
    string status = "";
    if(player.getName() != "") {
        status += player.racerStats();
        for(int i = 0; i < 3;i++) {
            if (team_[i].getName() != "") {
                status += team_[i].racerStats();
            }
        }
        status += " \n \nPoints " + to_string(player.getPoints()) + " | Money $" + to_string((int)getMoney()) + " | Level " + to_string(level_) + "\n";
        // status += menuBox("Inventory",1);
        if(player.arePartsUnlocked()) {
            // status += menuBox(player.bikeStats(),1);
            status += " \n" + player.bikeStats() + "\n";
        }
        if(player.areConsumablesUnlocked()) {
            status +=  " \n" + player.consumableStats();
        }
        status + " \n";
    }
    return status;
}

// The meat of the game. Functions include mainMenu, shop, map, ride
/*
mainMenu() - used mostly in the map class. Allows the user to repair bike, eat food, open map, and save game
*/
void Game::mainMenu() {
    int x = map_.getPlayerX();
    int y = map_.getPlayerY();
    int snacks_eaten = 0;
    int toolkits_used = 0;
    int option = 1;
    while(true) {
        string menu[5];
        menu[0] = "Move";
        if(map_.isShopLocation(x,y)) {
            menu[1] = "Shop";
        }   
        else {
            menu[1] = "Race";
        }
        menu[2] = "Eat";
        menu[3] = "Repair";
        menu[4] = "Save";
        while(true) {
            action = actionMenu(menu,5,option);
            gameWindow(map_.displayMap());
            int choice = cursorInput(5,option,"hor");
            if(choice == option) {
                break;
            }
            option = choice;
        }
        if(option == 1) {
            return;
        }
        else if(option == 2) {
            if(map_.isShopLocation(x,y)) {
                shop();
            }
            else {
                if(ride(false)) {
                    return;
                }
            }
        }
        else if(option == 3) {
            if(eat()) {
                snacks_eaten++;
            }
            info = to_string(snacks_eaten) + " snack(s) eaten\n" + to_string(player.getSnacks()) + " Snacks Left";

        }
        else if(option == 4) {
            if(repair()) {
                toolkits_used++;
            }
            info = to_string(toolkits_used) + " toolkit(s) used\n" + to_string(player.getToolkits()) + " Toolkits Left";
        }
        else if(option == 5) {
            if(level_ < 6) {
                usa = map_;
            }
            else {
                europe = map_;
            }
            saveGame();
            return;
        }
    }
    if(level_ < 6) {
        usa = map_;
    }
    else {
        europe = map_;
    }
}

void Game::shop() {
    vector<Items> selection;
    int purchase;
    Racer cart = player;
    int cart_tires = 0;
    int tab = 0;
    int equity = 0;
    double multiplier = bikeshop_.getMultiplier();
    bool exit = 0;
    string shopDisplay;
    int department = 1;
    int department_item[5] = {1,1,1,1,1};
    char cursor;
    info = "Welcome to the bike shop!\nWhat are you looking for today?";
    while(!exit) {
        while(true) {
            shopDisplay = menuBox(bikeshop_.cart(cart, player, department),0) + "\n";
            action = "Press ENTER to select a choice";
            gameWindow(shopDisplay);
            int choice = cursorInput(8,department,"vert");
            if(choice == department) {            
                info = "  \n  ";
                break;
            }
            department = choice;
            
        }
        // Option for leaving the shop. Either checkout, empty cart, or leave if there were never any items
        if(department == 8) {
            if(tab > 0) {
                equity = 0;
                // Calculate current part worth based on health
                for(int cat = 1; cat < 5; cat++) {
                    if(player.getBikePart(cat).getPrice() * multiplier > 0 && player.getBikePart(cat).getName() != cart.getBikePart(cat).getName()) {
                        equity += double(player.getBikePart(cat).getPrice() * multiplier) * double(player.getBikePart(cat).getQuality())/100.0;
                    }
                }
                shopDisplay = menuBox(bikeshop_.cart(cart, player, department),0) + "\n";
                if(equity) {
                    info = "Any old parts will be sold on the used market for $" + to_string(equity) + "\nConfirm sale of old parts and purchase new parts?";
                }
                else {
                    info = "Confirm purchase of new parts?\nGrand Total: $" + to_string(tab - equity);
                }
                exit = yesnoAction(shopDisplay);
                if(!exit) {
                    info =  "Empty cart and leave the shop?\n  ";
                    exit = yesnoAction(shopDisplay);
                    if(exit) {
                        cart = player;
                    }
                }
                else if(exit && setMoney(tab - equity)) {
                    info = "Purchase Successful!\nEnjoy Your New Items";
                    exit = true;
                }
                else if(exit && (money_ - tab + equity < 0)) {
                    info = "Whoops! It looks like you do not have enough funds\nEmpty cart and leave the shop?";
                    exit = yesnoAction(shopDisplay);
                    if(exit) {
                        cart = player;
                    }
                }
            }
            else {
                info = "You are leaving the shop without making any purchase.\nAre you sure you want to exit?";
                exit = yesnoAction(shopDisplay);
            }
        }
        else if(department > 0 && department < 5) {
            while(true) { 
                // Enter department for parts choice
                // All items with a name, price, department, and quality
                Items new_purchase;
                selection = bikeshop_.getInventory(department);
                while(true) {
                    gameWindow(menuBox(bikeshop_.displayInventory(department,department_item[department]),0) + "\n");
                    int choice = cursorInput(selection.size() + 1,department_item[department],"vert");
                    if(choice == department_item[department]) {
                        break;
                    }
                    department_item[department] = choice;
                }
                if(department_item[department] == selection.size() + 1) {
                    if(player.getBikePart(department).getName() != cart.getBikePart(department).getName()) {
                            tab -=  cart.getBikePart(department).getPrice() * multiplier;
                    }
                    cart.setPurchase(player.getBikePart(department), department);
                    // cart.removeItem(department);
                    break;
                }
                else {
                    new_purchase = selection.at(department_item[department]-1);
                    if(player.getBikePart(department).getName() == new_purchase.getName()) {
                        info = "Looks like you already own this item!\nNothing was added to your cart";
                    }
                    else {
                        if(player.getBikePart(department).getName() != cart.getBikePart(department).getName()) {
                            tab -=  cart.getBikePart(department).getPrice() * multiplier;
                        }
                        info = "Your cart has been updated to " + new_purchase.getName() + "\nFor $" + to_string(int(double(new_purchase.getPrice()) * multiplier));
                        tab += double(new_purchase.getPrice()) * multiplier;
                        cart.setPurchase(new_purchase,department);
                        cart.unlockParts(true);
                        break;

                    }
                }
            }
        }
        // Departments 6 and 7 for Toolkits and Snacks
        else if(department == 5 || department == 6 || department == 7) {
            int cart_inventory;
            int player_inventory;
            int max_items;
            string dep_name;
            int dep_price;

            if (department == 5) {
                cart_inventory = cart.getNumTires();
                player_inventory = player.getNumTires();
                max_items = player.MAX_TIRES - player_inventory;
                dep_name = "Tire";
                dep_price = bikeshop_.getTirePrice();
            }
            if (department == 6) {
                cart_inventory = cart.getSnacks();
                player_inventory = player.getSnacks();
                max_items = player.MAX_SNACKS - player_inventory;
                dep_name = "Snack";
                dep_price = bikeshop_.getSnackPrice();
            }
            else if(department == 7) {
                cart_inventory = cart.getToolkits();
                player_inventory = player.getToolkits();
                max_items = player.MAX_TOOLS - player_inventory;
                dep_name = "Toolkit";
                dep_price = bikeshop_.getToolPrice();
            }

            int number = 0 + cart_inventory;
            bool loop = true;
            while(loop) {
                shopDisplay = menuBox(dep_name + "s\n \nTotal: $" + to_string(dep_price * number) + "\n  \n" + numberScroll(max_items,number) + "\n  \n    Maximum " + to_string(max_items) + "    \n \n  \n0. Reset " + dep_name + "\n",1);

                gameWindow(shopDisplay + "\n");
                system("stty raw");
                char input = getchar();
                if(tolower(input) == 'w') {
                    if(number < max_items) {
                        number++;
                    }
                }
                else if(tolower(input) == 's') {
                    if(number > 0) {
                        number--;
                    }
                }
                else if(input == 13) {
                    loop = false;
                }
                system("stty cooked");
            }
            info = "Your cart has been updated to " + to_string(purchase) + " " + dep_name;
            if(purchase != 1) {
                info += "s";
            }
            info += "\nTotal $" + to_string(dep_price*purchase);

            purchase = number;
            dep_name[0] = tolower(dep_name[0]);

            if(department == 5) {
                tab -= (cart.getNumTires() - player.getNumTires()) * dep_price;
                cart.resetTires();
                cart.addTires(purchase + player.getNumTires());
            }
            else if(department == 6) {
                tab -= (cart.getToolkits() - player.getToolkits()) * dep_price;
                cart.setSnacks(purchase);
            }
            else if(department == 7) {
                tab -= (cart.getToolkits() - player.getToolkits()) * dep_price;
                cart.setToolkits(purchase);
            }
            tab += purchase * dep_price;
            cart.unlockConsumables(true);
        }
    }
    player = cart;
}

Map Game::map() {
    printStatus(player);
    if(level_ < 6) {
        map_ = usa;
    }
    else {
        map_ = europe;
    }
    while(true) {
        action = "Press ENTER to Explore Location";
        info = "  \n  ";
        int x = map_.getPlayerX();
        int y = map_.getPlayerY();
        if(map_.isShopLocation(x,y)) {
            info =  "It Looks Like There Is A Bike Shop In This Town!\nDo You Need Any New Parts? ";
            action = "Press ENTER To Visit Shop";
            gameWindow(map_.displayMap());
            direction = directionInput();;
            if(direction == 13) {
                shop();
                mainMenu();
            }
            map_.move(direction);
            continue;
        }
        else if(map_.isRaceLocation(x,y)) {
            int required_points = ((75)*pow((level_),2));
            if(player.getPoints() >= required_points && ride(true)) {
                levelUP();
                map_.removeRace(x,y);
            }
            else if (player.getPoints() < required_points){
                info = "Earn " + to_string(required_points) + " Qualification Points\nTo Enter This Race";
            }
            action = "Move In A Direction to Continue";
        }
        else if(map_.isFinalRace(x,y)) {
            if(map_.getRaceCount() == 0){
                if(ride(true)) {
                    player.addPoints(1000);
                    break;
                }
            }
            else {
                info = "Complete All Other Races\nOn The Map To Enter";
                action = "Move In A Direction to Continue";
            }
        }
        gameWindow(map_.displayMap());
        direction = directionInput();
        if(direction == 13 && !map_.isRaceLocation(x,y) && !map_.isFinalRace(x,y)) {
            int spot = map_.exploreSpace(x,y);
            mainMenu();
        }
        map_.move(direction);
    }
    if(level_ < 6) {
        usa = map_;
    }
    else {
        europe = map_;
    }
    return map_;
}

// the Ride function handles a race and all the conditions that may be associated with it. Not enough parts, not enough stats, tire condition etc.
bool Game::ride(bool next_level) {
    Items frame = player.getBikePart(1);
    Items suspension = player.getBikePart(2);
    Items brakes = player.getBikePart(3);
    Items wheels = player.getBikePart(4);

    if(frame.getQuality() <= 0 || suspension.getQuality() <= 0 || brakes.getQuality() <= 0 || wheels.getQuality() <= 0 || player.getNumTires() <= 1 && player.getTires().at(0) == 0) {
        info =  "Looks like you are missing some parts for your bike!\nHead to a shop to get more parts";
        action = "Move To A Different Location";
        return false;
    }
    if(player.getStrength() <= 10 || player.getSkill() <= 10 || player.getEndurance() <= 10 || player.getMental() <= 10) {
        info = "Hmm... You really aren't fit enough to do another race.\nEat some snacks and come back once your stats are better!";
        action = "Move To A Different Location";
        return false;
    }
    srand(time(NULL));
    /*
    The following block finds all avaialable races in the desired level and chooses a random one for this instance of the minigame
    */
    vector<int> available_races;
    for(int i = 0; i < races.size();i++) {

        if(next_level) {
            if(races.at(i).getLevel() == level_+1) {
                available_races.push_back(i);
            }
        }
        else {
            if(races.at(i).getLevel() <= level_) {
                available_races.push_back(i);
            }
        }
    }
    if(available_races.size() == 0) {
        info = "No More Races Left For Your Level!\nFind Some More Local Races To Level Up";
        action = "Move In A Direction To Continue";
        return false; // If there are no more races left for the required level.
    }
    
    //finds a random race from the races at the desired level
    int race_num = available_races.at(rand()%(available_races.size()));
    Minigame current_race = races.at(race_num);
    //delares a variables to be used to determine user terrain options and previous displayed terrains
    int options = current_race.getNumFeatures();
    int position = rand() % options;
    string old_positions;
    //Race has an entry fee
    int entry_fee = current_race.getEntry();
    //The win boolean will help return the correct value at the end of the race
    bool win = false;

    info = "The Entry Fee For The " + current_race.getName() + " Is $ " + to_string(entry_fee) + "\nWould You Like To Enter?";
    if(!yesnoAction(map_.displayMap())) {
        action = "Move In A Direction To Continue";
        gameWindow(map_.displayMap());
        return win;
    }
    money_ -= entry_fee;

    if(player.getNumTires() > 1 && player.getTires().at(0) < current_race.getLength()) {
        info = "It looks like your tires are running a little low.\nWould you like to replace them now?";
        if(yesnoAction(map_.displayMap())) {
            player.replaceTire();
        }
    }
    string raceDisplay;
    string split_times = "Splits:\n0";
    int gap = 0;
    int top_time = current_race.getTime();
    int split_time = top_time;
    int min = top_time/100000;
    string sec;
    string mil;
    for(int i = -1; i < current_race.getLength(); i++) {
        //Condition for outputting the start of the race
        if(i == -1) {
            raceDisplay = current_race.getStart();
            info = current_race.getName() + "\nLevel " + to_string(current_race.getLevel());
            action = "Press ENTER To Start" + to_string(current_race.getLength());
            gameWindow(raceDisplay);
            if(!continueGame()){
                return win;
            }
        }
        // All general terrain features
        else {
            srand(time(NULL));
            split_time = top_time / (position + 2);
            top_time -= split_time;
            if(i % 2 == 1) {
                sec = to_string(gap / 1000);
                mil = to_string(abs(gap % 1000));
                split_times += ", " + sec + "." + mil;
            }
            info = split_times;
            raceDisplay = menuBox(current_race.getTerrain(position),1) + "\n \n" + current_race.getName() + " \n";
            action = "SPACE BAR To Quit Race (Forefeit Entry Fee)";
            gameWindow(raceDisplay);
            int choice = directionInput();
            if(choice == 0) {
                info = "You are about to quit this race and lose all progress.\nAre you sure you want to continue?";
                if(yesnoAction(raceDisplay)) {
                    player.addPoints(-20);
                    action = "Move In A Direction To Continue";
                    return win;
                }
            }
            else {
                string modification = current_race.getModifiers(position,choice);
                double rate = (15.0 + double(rand() % 10)) / 100.0;
                double mental_effect = double(player.getMental())/100.0;
                double time_dial = split_time%10000;
                double turning_point = 40 + (5.0 * double(current_race.getLevel()));
                if(modification == "strength") {
                    player.modStrength(-rate);
                    gap += time_dial * mental_effect * ((double(player.getStrength())/turning_point) - 1.0);
                }
                else if(modification == "skill") {
                    player.modSkill(-rate);
                    gap +=  time_dial * mental_effect * ((double(player.getSkill())/turning_point) - 1.0);
                }
                else if(modification == "endurance") {
                    player.modEndurance(-rate);
                    gap += time_dial * mental_effect * double((double(player.getEndurance())/turning_point) - 1.0);
                }
                else if(modification == "time") {
                    // current_race.modTime();
                    gap -= 750;
                }
                rate = double(5 + rand() % (current_race.getLevel() * 5))/100.0;
                int part = rand() % 4;
                if(position == 4) {
                    part = 4;
                }
                switch (part) {
                    case 0:
                        player.modFrame(-rate);
                        break;
                    case 1:
                        player.modSuspension(-rate);
                        break;
                    case 2:
                        player.modBrakes(-rate);
                        break;
                    case 3:
                        player.modWheels(-rate);
                        break;
                    case 4:
                        player.modFrame(-rate);
                        player.modSuspension(-rate);
                        player.modBrakes(-rate);
                        player.modWheels(-rate);
                        break;
                }
                player.modTire();
                if(player.getTires().at(0) <= 0) {
                    info = "You got a flat! Make sure to put some fresh tires on next time!\n  ";
                    player.modMental(-rate*2);
                    return false;
                }
                if(player.getBikePart(1).getQuality() <= 0 || player.getBikePart(2).getQuality() <= 0 || player.getBikePart(3).getQuality() <= 0 || player.getBikePart(4).getQuality() <= 0) {
                    info = "#@%$! Your bike broke and you crashed!\nGo get some new parts from the bike shop to try again.";
                    player.modMental(-rate*2);
                    return false;
                }
                if(rand()%100 == 13) {
                    info = "#@%$! You crashed!\nHeal up quick and get back out here.";
                    player.modMental(-rate*2);
                    return false;
                }
                //Increment the gap with the current health of the bike.
                turning_point = 30.0; //Health before the gap becomes negative
                //Sum of all the bike part healths
                double bike_health = (player.getBikePart(1).getQuality() + player.getBikePart(2).getQuality() + player.getBikePart(3).getQuality() + player.getBikePart(4).getQuality())/4;

                gap += time_dial * double((((bike_health - turning_point)/2)/turning_point));
                // system("clear");
                // printStatus(player);

                // Checker to see if we have already used the terrain before. 
                //If the number of used terrain matches the number of available terrain, reset the old terrain  x to the current terrain
                if (old_positions.length() == (options - 1)) {
                    old_positions = to_string(position);
                }
                // Otherwise, add the current terrain to the list of old terrain
                else {
                old_positions = old_positions + to_string(position);
                }
                //Using the old terrain values, find another terrain and exit when it does not match any of the old terrain options.
                while(old_positions.find(to_string(position)) != string::npos)
                {   
                    position = rand() % options;
                }
            }
        }
    }
    sec = to_string(gap / 1000);
    mil = to_string(abs(gap % 1000));

    // cout << current_race.getTime() << " " << top_time << " " << split_time << endl;
    // cout << split_times << endl;
    int points = 0;
    int prize_money = 0;
    double margin = double(gap)/double((current_race.getTime()));
    // cout << margin << endl;
    // action = "Press 1 To Continue";
    if(gap > 0) {
        points = (double(current_race.getLevel())/7.0) * 275.0;
        prize_money = pow((double(current_race.getLevel())/7.0),2) * 1000.0;
        info =  "You've won by " + sec + "." + mil + " seconds\nYou earned " + to_string(points) + " points and $" + to_string(prize_money) + "!";
        win = true;
    }
    else if(margin < 0.005) {
        points = (double(current_race.getLevel())/7.0) * 175.0;
        prize_money = pow((double(current_race.getLevel())/7.0),2) * 750.0;
        info =  "You're the first loser by " + sec + "." + mil + " seconds\nPlease accept these " + to_string(points) + " points and $" + to_string(prize_money) + "!";
        win = true;
    }
    else if(margin < 0.01) {
        points = (double(current_race.getLevel())/7.0) * 125.0;
        prize_money = pow((double(current_race.getLevel())/7.0),2) * 500.0;
        info =  "You came third by " + sec + "." + mil + " seconds!\nHere's " + to_string(points) + " points and $" + to_string(prize_money) + "!";
        win = true;
    }
    else {
        info = "You were " + sec + "." + mil + " seconds back and didn't podium this time.\nTry again to earn some points and money!";
        points = (double(current_race.getLevel())/7.0) * -125.0;
        prize_money = 0;
    }
    if (win) {
        races.erase(races.begin() + race_num);
    }
    player.addPoints(points);
    money_ += prize_money;
    return win;
}

bool Game::eat() {
    if(player.getSnacks() > 0) {
        double rate = (10.0 + double(rand() % 20)) / 100.0;
        player.modStrength(rate);
        player.modSkill(rate);
        player.modEndurance(rate);
        player.modMental(rate);
        player.addSnacks(-1);
        // system("clear");
        // printStatus(player);
        return true;
    }
    return false;
}
bool Game::repair() {
    srand(time(NULL));
    if(player.getToolkits() > 0) {
        player.repair(5);
        // system("clear");
        // printStatus(player);
        return true;
    }
    return false;
}

// Setter and getter functions for money and checkpoint Game class variables
double Game::getMoney(){
    return money_;
}
bool Game::setMoney(double moneyflow) {
    if(moneyflow <= money_) {
        money_ -= moneyflow;
        return true;
    }
    else {
        info = "It looks like you do not have enough funds for this purchase!\nPlease edit your cart and try again";
        return false;
    }
}

int Game::getCheckpoint() {
    return checkpoint_;
}
void Game::setCheckpoint(int new_checkpoint) {
    checkpoint_ = new_checkpoint;
    // saveGame();
}


// Series of Functions for user input and output reset.
/*
// loadingScreen() - outputs an input string by displaying each letter one at a time to give a typing effect

continueGame() - calls the directionInput function with the maximum number of options. Prompts the user to input any number to continue

directionInput() - takes a number of options and asks the user to select one. does not require the "enter" key. Returns user input

directionInput() - prompts the user for a (w a s d) direction or 0 to return. Used in the map function. does not require the "enter" key. returns user input
*/
// void Game::loadingScreen(string destination, string display) {
//     double seconds = .05;
//     double micro_seconds = 1000000;
//     double sleep_duration = seconds * micro_seconds;
//     string piece;
//     for (int j = 0; j < destination.length();j++) {
//         piece += destination[j];
//         info = piece + "\n  ";
//         gameWindow(display);
//         cout.flush();
//         usleep(sleep_duration);
//         system("clear");

//     }
//     for(int i = 0; i < (3);i++) {
//         piece += ".";
//         info = piece + "\n  ";
//         gameWindow(display);
//         cout.flush();
//         usleep(sleep_duration * 3);
//         system("clear");
//     }
//     // usleep(sleep_duration * 10);
//     cin.clear();
//     // cin.ignore();
//     printStatus(player);
// }

bool Game::continueGame() {
    system("stty raw");
    char input;
    int output;
    while(true) {
        input = getchar();
        if(input == 27 || input == 13) {
            output = input - 27;
            break;
        }
    }
    system("stty cooked");
    return output;
}

char Game::directionInput() {
    // code to take user input without having to press enter! Change system mode to raw and back to normal 
    // Output prompt
    cout << endl << endl;
    cout << "Press W, A, S, D to MOVE" << endl;
    cout << endl << "Hit ESC to RESTART GAME" << endl;
    system("stty raw");
    bool prompt = false;
    char input;
    //Input Validation and line deletion so we do not print "invalid" multiple times on screen
    while (true) {
        // Get single character input
        input = getchar();
        if (input == 27) {
            restart();
        }
        else if(tolower(input) == 'w' || tolower(input) == 'a' || tolower(input) == 's' || tolower(input) == 'd' || input == 13) {
            break;
        }
    }
    // Reset terminal to normal mode 
    system("stty cooked");
    cout.flush();
    if(player.getName() != "") {
        printStatus(player);
    }
    return input;
}

int Game::cursorInput(int choices, int position, string orientation) {
    // code to take user input without having to press enter! Change system mode to raw and back to normal 
    cout << endl;
    //Input Validation and line deletion so we do not print "invalid" multiple times on screen
    char input;
    int old_position = position;
    // Output prompt
     if(orientation == "vert") {
        cout << "\nChoose An Option Using: W (UP) and S (DOWN).\n\nPress ENTER To Select\n";
    }
    else {
        cout << "\nChoose An Option Using: A (LEFT) and D (RIGHT).\n\nPress ENTER To Select\n";
    }
    cout << endl << "Hit ESC to RESTART GAME\n";
    while (true) {
        system("stty raw");
        // Get single character input
        input = getchar();

        if(tolower(input) == 'w' && orientation == "vert" || tolower(input) == 'a' && orientation == "hor") {
            if(position == 1) {
                position = choices;
            }
            else {
                position--;
            }
            break;
        }
        else if(tolower(input) == 's' && orientation == "vert" || tolower(input) == 'd' && orientation == "hor" ) {
            if(position == choices) {
                position = 1;
            }
            else {
                position++;
            }
            break;
        }
        else if(input == 13) {
           break;
        }
        else if(input == 27) {
            restart();
        }            
    }
    // Reset terminal to normal mode 
    system("stty cooked");
    cout.flush();
    return position;
}

void Game::restart() {
    int option = 1;
    char input;
    while (true) {
        system ("stty cooked");
        cout << endl << "Are you sure you want to quit?\nAny progress since your last save will be lost" << endl;
        cout << menuBox(actionMenu(yesno,2,option),1) << endl;
        system("stty raw");
        input = getchar();
        for(int i = 0; i < 6; i++) {
            printf("\033[A");
            printf("\33[2K\r");
        }
        if(tolower(input) == 'd') {
            if(option == 1) {
                option = 2;
            }
            else {
                option = 1;
            }
        }
        else if(tolower(input) == 'a') {
            if(option == 2) {
                option = 1;
            }
            else {
                option = 2;
            }
        }
        else if(input == 13) {
            break;
        }
    }
    if(option == 1) {
        system("clear");
        system("stty cooked");
        system("make");
        system("./mtbRPG");
        exit(0);
    }
}
// I made a change

string Game::choiceList(string choices[],int number,int cursor) {
    string output;
    cursor--;
    for(int i = 0; i < number;i++) {
        string piece = choices[i];
        if(choices[i].substr(0,1) == " ") {
            output += " \n";
            piece = choices[i].substr(1);
        }
        if(cursor == i) {
            output += "~ ";
        }
        else {
            output += "  ";
        }
        output += piece + "\n";

        
    }
    return output;
}

string Game::actionMenu(string choices[],int number,int cursor) {
    string output;
    cursor--;
    for(int i = 0; i < number;i++) {
        string piece = choices[i];
        if(piece == "") {
            continue;
        }
        if(i>0) {
            output += " | ";
        }
        if(cursor == i) {
            output += "~ " + piece + " ~";
        }
        else {
            output += "  " + piece + "  ";
        }
    }
    return output;
}

bool Game::yesnoAction(string display) {
    int option = 1;
    while (true) {
        action = actionMenu(yesno,2,option);
        gameWindow(display);
        int choice = cursorInput(2,option,"hor");
        if(choice == option) {
            break;
        }
        option = choice;
    }
    info = "  \n  ";
    return  (option - 2);
}

string Game::numberScroll(int choices, int number) {
    string output;
    if(number == choices) {
        output = "<< " + to_string(number) + "  ";
    }
    else if(number == 0) {
        output = "   " + to_string(number) + " >>";
    }
    else {
        output = "<< " + to_string(number) + " >>";
    }
    return output;
    
}

// Pair of functions to save the current game and load a saved game
void Game::saveGame() {
    string save_name = player.getName();
    ofstream fout;
    ifstream check;
    string line;
    bool overwrite = true;
    bool exists = false;
    check.open("./saves/savelist.txt");
    if(!check.fail()) {
        getline(check,line);
        while(!check.eof()) {
            if(line == save_name) {
                exists = true;
                info = "A save file for " + save_name + " already exists.\nOverwrite?";
                overwrite = yesnoAction(map_.displayMap());
                break;
            }
            getline(check,line);
        }
        if(!exists) {
            fout.open("./saves/savelist.txt",ios_base::app);
            fout << save_name << endl;
            fout.close();
        }
    }
    else {
        system("mkdir ./saves/");
        ofstream create("./saves/savelist.txt");
        create.close();
        saveGame();
        return;
    }
    check.close();
    if(overwrite) {
        fout.open("./saves/" + save_name + ".txt");
        // if(fout.fail()) {
        //     return -1;
        // }
        fout << player.getName() << ",name" << endl;
        fout << player.getStrength() << ",strength" << endl;
        fout << player.getSkill() << ",skill" << endl;
        fout << player.getEndurance() << ",endurance" << endl;
        fout << player.getMental() << ",mental" << endl;
        fout << player.getPoints() << ",points" << endl;
        fout << player.getToolkits() << ",toolkits" << endl;
        fout << player.getSnacks() << ",snacks" << endl;
        fout << player.areConsumablesUnlocked() << ",consumables unlocked" << endl;
        fout << player.arePartsUnlocked() << ",parts unlocked" << endl;
        for(int i = 1; i < 5;i++) {
            Items part = player.getBikePart(i);
            fout << part.getName() << "," << part.getPrice() << "," << part.getQuality() << "," << part.maxQuality() << endl;
        }
        vector<int> tires = player.getTires();
        for(int j = 0; j < player.getNumTires(); j++) {
            fout << tires.at(j) << ",tires" << endl;
        }
        // Game Variables
        fout << level_ << ",level" << endl;
        fout << money_ << ",money" << endl;
        fout << checkpoint_ << ",checkpoint_" << endl;
        // Map Variables
        Map save = usa;
        string save_name = "USA";
        for(int i = 0;i < 2;i++) {
            fout << save.getWidth() << "," << save.getHeight() << "," << save_name << " width/height" << endl; // map width and height
            for(int y = 0; y < save.getHeight();y++) {
                for(int x = 0; x < save.getWidth()-1;x++) {
                    fout << save.getMapArea(x,y); // map area
                }
                fout << "\n";
            }
            for(int y = 0; y < save.getHeight();y++) {
                for(int x = 0; x < save.getWidth();x++) {
                    fout << save.getMapData(x,y); // all map data
                }
            }
            fout << endl;
            fout << save.getPlayerX() << "," << save.getPlayerY() << "," << save_name << " player(x.y)" << endl; // player position in x,y format

            fout << save.getFinalX() << "," << save.getFinalY() << "," << save_name << " Final" << endl; // final position in x,y

            fout << save.getShopCount() << "," << save.getRaceCount() << "," << save_name << " shop count,race count" << endl;

            fout << save.getMaxShops() << ",map max shops" << endl;

            for(int m = 0; m < save.getShopCount();m++) {
                fout << save.getShopData(m) << "," << save_name << " shop " << m << " data" << endl; // all shop data
            }
            for(int m = 0; m < save.getRaceCount();m++) {
                fout << save.getRaceData(m) << "," << save_name << " race " << m << " data" << endl; // all race data
            }
            save = europe;
            save_name = "EUROPE";
        }
        for(int i = 0; i < races.size();i++){
            fout << races.at(i).getAttributes() << ",race" << endl;
        }
        fout << "loaded" << endl;
        
        // loadingScreen("Saving Game",map_.displayMap());
        info = "Game Saved\n  ";
    }
    fout.close();
}

void Game::loadGame() {
    if(level_ < 6) {
        usa = map_;
    }
    else {
        europe = map_;
    }
    ifstream fin;
    string load_name;
    string title = "Choose A Save File to Load\n \n";
    vector<string> load_list;
    int saved = 0;
    bool overwrite = true;
    fin.open("./saves/savelist.txt");
    if(!fin.fail()) {
        getline(fin,load_name);
        while(!fin.eof()) {
            load_list.push_back(load_name);
            saved++;
            getline(fin,load_name);
        }
        if(saved <= 0) {
            cout << "No saves available" << endl;
            // loadingScreen("Heading back to menu","  \n  ");
        }
        else {
            int size = load_list.size() + 1;
            string menu_list[size];
            for(int i = 0; i < size - 1;i++) {
                menu_list[i] = load_list.at(i);
            }
            menu_list[size - 1] = " GO BACK";
            // Cursor movement block
            int option = 1;
            while(cursor != 13) {
                system("clear");
                cout << menuBox(title + choiceList(menu_list,size,option),0);                
                int choice = cursorInput(size,option,"vert");
                if(choice == option){
                    break;
                }
                option = choice;
            }
            if(option == size) {
                return;
            }
            load_name = load_list.at((option-1));
        }
    }
    fin.close();
    fin.open("./saves/" + load_name + ".txt");
    string value;
    string line[10];
    vector<int> saved_tires;
    int race_num = 0;
    bool loaded = false;
    int loop = 0;
    static const int count = 0;
    if(!fin.fail()) {
        if(fin.fail()) {
            return;
        }
        while(line[0] != "loaded") {
            getline(fin,value);
            split(value,',',line,10);
            switch(loop) {
                case count: // Set Name
                    player.setName(line[0]);
                    break;
                case count + 1: // Set Strength
                    player.setStrength(stoi(line[0]));
                    break;
                case count + 2: // Set Skill
                    player.setSkill(stoi(line[0]));
                    break;
                case count + 3: // Set Endurance
                    player.setEndurance(stoi(line[0]));
                    break;
                case count + 4: // Set Mental
                    player.setMental(stoi(line[0]));
                    break;
                case count + 5: // Set Points
                    player.setPoints(stoi(line[0]));
                    break;
                case count + 6: // Set Tools
                    player.setToolkits(stoi(line[0]));
                    break;
                case count + 7: // Set Snacks
                    player.setSnacks(stoi(line[0]));
                    break;
                case count + 8: // Set Consumables Lock Status
                    player.unlockConsumables(stoi(line[0]));
                    break;
                case count + 9: // Set Parts Lock Status
                    player.unlockParts(stoi(line[0]));
                    break;
                case count + 10: // Input all Bike Parts
                    for(int department = 1; department < 5;department++) {
                        Items part = Items(line[0],stoi(line[1]),stoi(line[2]),stoi(line[3]));
                        player.setPurchase(part,department);
                        getline(fin,value);
                        split(value,',',line,5);
                    }
                    loop++; // No break statement, we already did a getline
                case count + 11: // Input all tire healths
                    while(true) {
                        if(line[1] == "tires") {
                            saved_tires.push_back(stoi(line[0]));
                            getline(fin,value);
                            split(value,',',line,5);
                        }
                        else {
                            player.setTires(saved_tires);
                            break;
                        }
                    }
                    loop++; // No break statemtent, we already did a getline
                case count + 12: // Input Game Level
                    level_ = stoi(line[0]);
                    bikeshop_.changeMultiplier(level_);
                    break;
                case count + 13: // Money Save
                    money_ = stoi(line[0]);
                    break;
                case count + 14: // Checkpoint Save
                    checkpoint_ = stoi(line[0]);
                    break;
                case count + 15: // Map Saves
                    // Map Variables
                    for(int m = 0;m<2;m++) {
                        Map load;
                        load.setWidth(stoi(line[0])); // load map width
                        load.setHeight(stoi(line[1])); // load map width
                        for(int rise = 0;rise < load.getHeight();rise++) {
                            getline(fin,value);
                            int index = 0;
                            for (int run = 0;run < load.getWidth()-1;run++) {
                                bool valid = false;
                                if(value[index++] == '1') {
                                    valid = true;
                                }
                                load.inputMapArea(run,rise,valid); // load base map data per character
                            }
                        }
                        char input_data;
                        for(int rise = 0;rise < load.getHeight();rise++) {
                            for (int run = 0;run < load.getWidth();run++) {
                                if(rise != load.getHeight() && run != load.getWidth()) {
                                    fin.get(input_data);
                                    load.inputMapData(run,rise,input_data); // load base map data per character
                                }
                            }
                        }
                        fin.get(input_data); // throw away the '\0'
                        getline(fin,value); // first real next line
                        split(value,',',line,5);
                        load.setPlayerPosition(stoi(line[0]),stoi(line[1])); // load player position
                        getline(fin,value);
                        split(value,',',line,5);
                        load.setFinalRace(stoi(line[0]),stoi(line[1])); // load final position
                        getline(fin,value);
                        split(value,',',line,5);
                        int map_shops = stoi(line[0]); // number of shops for entry use
                        int map_races = stoi(line[1]); // number of races for entry use
                        getline(fin,value);
                        split(value,',',line,5);
                        load.setMaxShops(stoi(line[0]));
                        for(int i = 0; i < map_shops; i++) {
                            getline(fin,value);
                            split(value,',',line,5);
                            load.addShop(stoi(line[0]),stoi(line[1]),stoi(line[2])); // load shops
                        }
                        for(int i = 0; i < map_races; i++) {
                            getline(fin,value);
                            split(value,',',line,5);
                            load.addRace(stoi(line[0]),stoi(line[1])); // load races
                        }
                        if(m == 0) {
                            usa = load; // first go is the usa]
                            getline(fin,value);
                            split(value,',',line,5);
                        }
                        else {
                            europe = load; // second go is europe
                        }
                    }
                    break;
                case count + 16:
                    while(line[0] != "loaded") {
                        Minigame temp(line[0],stoi(line[1]),stoi(line[2]),stoi(line[3]),stoi(line[4]),stoi(line[5]),stoi(line[6]),stoi(line[7]));
                        races.push_back(temp);
                        getline(fin,value);
                        split(value,',',line,10);
                    }
                    race_num = races.size();
                default:
                    loaded = true;
                    break;
            }
            loop++;
        }
        // loadingScreen("Game // loading","  \n  ");
    }
    else {
        system("clear");
        cout << menuBox("Could not locate save file.\nFile may be lost or corrupt\n \n>> Go Back",0);
        cursorInput(1,1,"vert");
    }
}


// Series of functions from other inherited classes that require functions from "funcs.h". i.e. split and menuBox
int Minigame::readfeatures(string filename) {
    ifstream fin;
    string image = "";
    num_features = 0;
    fin.open("./races/" + filename);
    if(fin.fail()) {
        return -1;
    }

    while(num_features < NUM_TERRAIN && !fin.eof()) {
        getline(fin, image);
        string first_char = image.substr(0,1);
        if(image.substr(0,1) == "\xe2") {
            string attributes[5];
            int pieces = split(image,',',attributes,5);
            terrain_choices[num_features] = stoi(attributes[1]);
            for(int i = 2;i<pieces;i++) {
                modifiers[num_features][i-2] = attributes[i];
            }
            num_features++;
        }
        else {
            terrain_[num_features] += image + "\n";
        }
    }
    fin.close();
    fin.open("./races/starts.txt");
    if(fin.fail()) {
        return -1;
    }
    int start_num = 0;
    while(start_num < 5 && !fin.eof()) {
        getline(fin,image);
        while(image.substr(0,1) != "\xe2"){
            starts_[start_num] += image + "\n";
            getline(fin, image);
        }
        start_num++;
    }
    fin.close();
    return num_features;
}

int Game::readRaces(string filename) {
    ifstream fin;
    string line = "";
    fin.open("./races/" + filename);
    if(fin.fail()) {
        return -1;
    }

    while(!fin.eof()) {
        getline(fin, line);
        string read_race[2];
        
        if(line != "") {
            if(split(line,',',read_race,2) == 2) {
                Minigame track(read_race[0],stoi(read_race[1]));
                races.push_back(track);
            }
        }
    }
    return races.size();
}

// making an edit for makefile

int Shop::readInventory(string filename) {
    ifstream fin;
    string line;
    string current_line[4];
    int pieces = 0;
    int department = 0;

    fin.open("./items/" + filename);
    
    if(fin.fail()) {
        cout << "Shop file input failed!" << endl;
    }
    else {
        while(!fin.eof()) {
            getline(fin, line);
            pieces = split(line,',',current_line,3);
            if(pieces == 3) {
                Items item(current_line[0],stod(current_line[1]),stoi(current_line[2]),stoi(current_line[2]));
                switch(department) {
                    case 0:
                        frames_.push_back(item);
                        break;
                    case 1:
                        suspension_.push_back(item);
                        break;
                    case 2:
                        brakes_.push_back(item);
                        break;
                    case 3:
                        wheels_.push_back(item);
                        break;
                    case 4:
                        tires_.push_back(item);
                        break;
                }
            }
            else {
                department++;
            }
            
        }
    }
    return 0;
}


#include "Game.h"
#include "funcs.h"
#include <string>
#include <filesystem>
namespace fs = std::filesystem;

// Included to be able to use the usleep() function to pause our program for animation
#include <unistd.h>
#include <stdio.h>

// Converts prompt menus into a nice box output

Game::Game() {
    system("clear");
    level_ = 0;
    money_  = 6050;
    checkpoint_ = 0;
    usa = Map("usa");
    europe = Map("europe");
    readRaces("races.txt");
    int choice = 1;
    while (choice != 0) {
        cout << menuBox("1. Load Game | 2. New Game | 0. Terminate Program",1);
        choice = userInput(3);
        if(choice == 0) {
            system("clear");
            exit(0);
        }
        else if(choice == 1) {
            loadGame();
            if(player.getName() != "") {
                break;
            }
        }
        else {
            loadingScreen("Starting New Game");
            break;
        }
    }
}

bool Game::levelUP() {
    int old_level = level_;
    level_ = player.getPoints() / 200;
    if (old_level == level_) {return false;}
    else{
        for(int i = 0; i < races.size();i++) {
            if(races.at(i).getLevel() < level_) {
                races.erase(races.begin() + i);
            }
        }
        return true;
    }
}
void Game::initializeMaps() {
    usa = Map("usa");
    europe = Map("europe");
}

int Game::setPlayerName(string input) {
    player.setName(input);
    return 0;
}

void Game::printStatus(Racer racer) {
    string status = " ";
    if(player.getName() != "") {
        status += player.racerStats();
        for(int i = 0; i < 3;i++) {
            if (team_[i].getName() != "") {
                status += team_[i].racerStats();
            }
        }
        status += " \n \n" + to_string(player.getPoints()) + " Points | Money $" + to_string((int)getMoney()) + "\n" + menuBox("INVENTORY",1);
        if(player.arePartsUnlocked()) {
            // status += menuBox(player.bikeStats(),1);
            status += " \n" + player.bikeStats() + "\n";
        }
        if(player.areConsumablesUnlocked()) {
            status +=  " \n" + player.consumableStats();
        }
        cout << menuBox(status,1);
        cout << endl;
    }
}

// The meat of the game. Functions include mainMenu, shop, map, ride
/*
mainMenu() - used mostly in the map class. Allows the user to repair bike, eat food, open map, and save game
*/
void Game::mainMenu(bool shopy, bool racey) {
    bool exit = 0;
    Map map_;
    bool isShop;
    while(!exit) {
        int options = 0;
        string output = to_string(++options) + ". Map\n \n";
        if(map_.isShopLocation(map_.getPlayerX(),map_.getPlayerY())) {
            output += to_string(++options) + ". Shop\n \n";
            isShop = true;
        }
        if(map_.isRaceLocation(map_.getPlayerX(),map_.getPlayerY())) {
            output += to_string(++options) + ". Race\n \n";
            isShop = false;
        }
        cout << menuBox(output + to_string(++options) + ". Eat\n" + to_string(++options) + ". Repair\n \n0. Save Game",0);
        int option = userInput(5);
        if(option == 0) {
            saveGame();
        }
        else if(option == 1) {
            map_ = map();
        }
        else if(option == options - 2) {
            if(isShop) {
                shop();
            }
            else {
                ride(level_ + 1);
            }
        }
        else if(option == options - 1) {
            eat();
        }
        else if(option == options) {
            repair();
        }

    }
}

void Game::shop() {
    string menu_text;
    int department;
    vector<Items> selection;
    int category;
    int purchase;
    bool confirmation = 1;
    Racer cart = player;
    int cart_tires = 0;
    int parts_tab = 0;
    int tab = 0;
    double multiplier = bikeshop_.getMultiplier();
    bool exit = 0;
    cout << "Welcome to the level " << level_ << " bike shop! What are you looking for today?" << endl << endl;
    while(!exit) {
        // string cart_output = bikeshop_.cart(cart, player, cart_tires);
        // cout << menuBox(cart_output);
        string cart_total = menuBox("Current Cart Total: $" + to_string(tab),1);
        cart_total += bikeshop_.cart(cart, player, cart_tires);
        cout << menuBox(cart_total,0);
        // cout << menuBox("Pick A Department\n \n1. PARTS | 2. TOOLKITS | 3. SNACKS | 4. CHECKOUT\n \n0. EXIT SHOP");
        department = userInput(8);
            if(department == 0) {
                if(tab > 0) {
                    int equity = 0;
                    for(int c = 1;c<5;c++) {
                        if(player.getBikePart(c).getPrice() > 0 && player.getBikePart(c).getName() != cart.getBikePart(c).getName()) {
                            equity += double(player.getBikePart(c).getPrice()) * double(player.getBikePart(c).getQuality())/100.0;
                        }
                    }
                    cout << menuBox("Current Cart\nTotal: $" + to_string(tab),1);
                    bikeshop_.cart(cart, player, cart_tires);
                    cout << "Any old parts will be sold on the used market for $" << equity << endl;
                    cout << endl << "Confirm Sale of old parts and purchase new parts?" << endl;
                    cout << menuBox("1. Yes | 0. No",1);
                    exit = userInput(2);
                    if(exit && !setMoney(tab - equity)) {
                        exit = 0;
                    }
                    else if(!exit) {
                        cout << "Empty cart and leave the shop?" << endl;
                        cout << menuBox("1. Yes | 0. No",1);
                        exit = userInput(2);
                        if(exit) {
                            cart = player;
                        }
                    }
                }
                else {
                    cout << "You are leaving the shop without making any purchase.\nAre you sure you want to exit?" << endl;
                    cout << menuBox("1. Yes | 0. No",1);
                    exit = userInput(2);
                }
            }
            else if(department > 0 && department < 6) {
                while(true) { // Enter category for parts choice
                    if(department == 5) // Tires as a consumable
                    {
                        if(player.getNumTires() >= player.MAX_TIRES) {
                            cout << "Looks like you're all maxed out on tires!";
                            loadingScreen("Heading back to shop");
                        }
                        else {
                            int remaining_tires = player.MAX_TIRES - player.getNumTires();
                            int tire_price = bikeshop_.getTirePrice() * multiplier;
                            cout << menuBox("Tires - $" + to_string(tire_price) + " each\n \nHow many tires would you like in your cart?\n \nMAXIMUM " + to_string(remaining_tires),1);
                            purchase = userInput(remaining_tires + 1);
                            cout <<"Your cart has been updated to " << purchase << " tires for $" << (purchase*tire_price) << endl;
                            tab += (purchase - cart_tires)  * tire_price;
                            cart_tires = purchase;
                            loadingScreen("Heading back to shop");
                            break;
                        }
                    }
                    else // All items with a name, price, category, and quality
                    {
                        category = department;
                        Items new_purchase;
                        selection = bikeshop_.displayInventory(category);
                        int options = selection.size() + 2;
                        purchase = userInput(options) - 1;
                        if(purchase == -1) {
                            break;
                        }
                        else if(purchase == options - 2) {
                            if(player.getBikePart(category).getName() != cart.getBikePart(category).getName()) {
                                    tab -=  cart.getBikePart(category).getPrice() * multiplier;
                            }
                            cart.setPurchase(player.getBikePart(category), category);
                            // cart.removeItem(category);
                            break;
                        }
                        else {
                            new_purchase = selection.at(purchase);
                            if(player.getBikePart(category).getName() == new_purchase.getName()) {
                                cout << "Looks like you already own this item! Nothing was added to your cart." << endl;
                            }
                            else {
                                if(player.getBikePart(category).getName() != cart.getBikePart(category).getName()) {
                                    tab -=  cart.getBikePart(category).getPrice() * multiplier;
                                }
                                cout <<"Your cart has been updated to " << new_purchase.getName() << " for $" << new_purchase.getPrice() * multiplier << endl;
                                tab += new_purchase.getPrice() * multiplier;
                                cart.setPurchase(new_purchase,category);
                                cart.unlockParts(true);
                            }
                            loadingScreen("Heading back to shop");
                            break;
                        }
                    }
                }
            }
            // Departments 6 and 7 for Toolkits and Snacks
            else if(department == 6 || department == 7) {
                int max_items;
                string dep_name;
                int dep_price;
                if(department == 7) {
                    max_items = player.MAX_TOOLS - player.getToolkits();
                    dep_name = "Toolkits";
                    dep_price = bikeshop_.getToolPrice() * multiplier;
                }
                else if (department == 6) {
                    max_items = player.MAX_SNACKS - player.getSnacks();
                    dep_name = "Snacks";
                    dep_price = bikeshop_.getSnackPrice() * multiplier;
                }
                if(max_items > 0) {
                    cout << menuBox("Current Cart Total: $" + to_string(tab),1);
                    bikeshop_.cart(cart, player, cart_tires);
                    cout << menuBox(dep_name + " - $" + to_string(dep_price) + " each \n \nENTER AN AMOUNT TO UPDATE CART\n \nMAXIMUM " + to_string(max_items),1);
                    purchase = userInput(max_items + 1);
                    dep_name[0] = tolower(dep_name[0]);
                    if(purchase > 0) {
                    if(department == 7) {
                        tab -= (cart.getToolkits() - player.getToolkits()) * dep_price;
                        cart.setToolkits(player.getToolkits() + purchase);
                    }
                    else if(department == 6) {
                        tab -= (cart.getToolkits() - player.getToolkits()) * dep_price;
                        cart.setSnacks(player.getSnacks() + purchase);
                    }
                    tab += purchase * dep_price;
                    cart.unlockConsumables(true);
                    cout << "Your cart has been updated to " << purchase << " " << dep_name << "(s) for $" << dep_price;
                    }
                }
                else {
                    dep_name[0] = tolower(dep_name[0]);
                    cout << "Looks like you're all maxed out on " << dep_name;
                }
                if(confirmation) {
                    loadingScreen("Heading back to shop");
                }
            }
    }
    cart.addTires(cart_tires,money_,multiplier);
    player = cart;
    loadingScreen("Heading back to Main Menu");
}

Map Game::map() {
    system("clear");
    printStatus(player);
    Map map;
    int final_level;
    if(level_ < 6) {
        map = usa;
        final_level = 5;
    }
    else {
        map = europe;
        final_level = 7;
    }
    int x = map.getPlayerX();
    int y = map.getPlayerY();
    while(true) {
        char direction;
        // cout << "On a shop space? ..." << map.isShopLocation(map.getPlayerX(), map.getPlayerY()) << endl;
        // cout << "On a race space? ..." << map.isRaceLocation(map.getPlayerX(),map.getPlayerY()) << endl;
        // cout << map.getShopCount() << endl;
        cout << menuBox("MAP KEY\n \nX = Player\n \nO = Explored Space | * = Passed Through Location\n \nR = Race | S = Shop | % = Final Race",0);
        map.displayMap();
        direction = directionInput();
        // cin >> direction;
        if(direction == 48) {
            if(map.isExplored(map.getPlayerX(),map.getPlayerY())) {
                break;
            }
            int spot = map.exploreSpace(map.getPlayerX(),map.getPlayerY());
            if(spot == 1) {
                cout << "There seems to be a bike shop at this location.\n\nwould you like to purchase new items?\n" << endl;
                cout << menuBox("1. Enter Shop | 0. No",1);
                bool choice = userInput(2);
                if(choice) {
                    shop();
                }
            }
            if(spot == 2) {
                if(level_ != 0) {
                    cout << "There is a race happening at this location now! Would you like to join?" << endl;
                    cout << menuBox("1. Enter Race | 0. No",1);
                    bool choice = userInput(2);
                    if(choice) {
                        ride(level_);
                    }
                }
                map.removeRace(x,y);
            }
            break;
        }
        else {
            map.move(direction);
            x = map.getPlayerX();
            y = map.getPlayerY();
            if(map.isShopLocation(x,y)) {
                cout << "There is a bike shop in this town!\n\nWould you like to go in?\n" << endl;
                cout << menuBox("1. Yes | 0. No",1);
                bool choice = userInput(2);
                if(choice) {
                    shop();
                    map.removeShop(x,y);
                }
            }
            if(map.isRaceLocation(x,y)) {
                if(ride(level_ + 1)) {
                    map.removeRace(x,y);
                }
            }
            if(map.isFinalRace(x,y)) {
                if(level_ == final_level){
                    ride(level_);
                }
                else {
                    loadingScreen("You are not qualified to enter this race yet. Go compete in some other events to earn qualification points then come back!");
                }
            }
        }
    }
    if(level_ < 6) {
        usa = map;
    }
    else {
        europe = map;
    }
    return map;
}

bool Game::ride(int required_level) {
    Items frame = player.getBikePart(1);
    Items suspension = player.getBikePart(2);
    Items brakes = player.getBikePart(3);
    Items wheels = player.getBikePart(4);

    if(frame.getName() == "" || suspension.getName() == "" || brakes.getName() == "" || wheels.getName() == "" || player.getTires().at(0) == 0) {
        cout << "Looks like you are missing some parts for your bike!\nHead back to a shop to get what you still need" << endl;
        return false;
    }
    if(player.getStrength() == 0 || player.getSkill() == 0 || player.getEndurance() == 0 || player.getMental() == 0) {
        cout << "Hmm... You really aren't fit enough to do another race. Eat some snacks and come back once your stats are better!" << endl;
        return false;
    }
    srand(time(NULL));
    /*
    The following block finds all avaialable races in the desired level and chooses a random one for this instance of the minigame
    */
    vector <int> available_races;;
    for(int i = 0; i < races.size();i++) {
        if(races.at(i).getLevel() == required_level) {
            available_races.push_back(i);
            break;
        }
    }
    if(available_races.size() == 0) {
        cout << "This should not happen... NO MORE RACES LEFT FOR LEVEL | ERROR" << endl;
        continueGame();
        return false; // If there are no more races left for the current level.
    }
    
    //finds a random race from the races at the desired level
    int race_num = rand() % available_races.size();
    Minigame current_race = races.at(available_races.at(race_num));

    //delares a variable to be used to determine user terrain options and previous displayed terrains
    int options = current_race.getNumFeatures();
    int position = rand() % options;
    string old_positions;
    int entry_fee = current_race.getEntry();
    if(required_level > 0) {
        cout << "The entry fee for the " << current_race.getName() << " is $" << entry_fee << endl << endl << "Would you like to enter?" << endl;
        cout << menuBox("1. Yes | 0. No",1);
        if(!userInput(2)) {
            return false;
        }
    }
    money_ -= entry_fee;
    for(int i = -1; i < current_race.getLength(); i++) {
        //Condition for outputting the start of the race
        if(i == -1) {
            cout << menuBox(current_race.getName() + "\n \n" + current_race.getStart(),1);
            if(!continueGame()){
                loadingScreen("Exiting Race");
                break;
            }
        }
        // All general terrain features
        else {
            srand(time(NULL));
            cout << menuBox(current_race.getName() + "\n \n" + current_race.getTerrain(position) + " \n0. Quit Race (Forefeit Entry Fee)",1);
            int choice = userInput(current_race.getChoices(position) + 1);
            if(choice == 0) {
                cout << "You are about to quit this race and lose all progress.\n\nAre you sure you want to continue?" << endl;
                cout << menuBox("1. Yes | 0. No ",1);
                if(userInput(2)) {
                    player.addPoints(-20);
                    loadingScreen("Exiting Race");
                    break;
                }
            }
            else {
                string modification = current_race.getModifiers(position,choice);
                double rate = (double(level_) + double(rand() % 10)) / 100.0;
                if(modification == "strength") {
                    player.modStrength(-rate);
                    cout << "it worked" << endl;
                }
                else if(modification == "skill") {
                    player.modSkill(-rate);
                    cout << "it worked" << endl;
                }
                else if(modification == "endurance") {
                    player.modEndurance(-rate);
                    cout << "it worked" << endl;
                }
                else if(modification == "time") {
                    // current_race.modTime();
                    cout << "it worked" << endl;
                }
                rate = 1 + rand() % 3;
                player.modFrame(-rate);
                player.modSuspension(-rate);
                player.modBrakes(-rate);
                player.modWheels(-rate);
                player.modTire();
                system("clear");
                printStatus(player);

                // if(frame.getQuality() == 0 || suspension.getQuality() == 0 || brakes.getQuality() == 0 || wheels.getQuality() == 0 || tire_health == 0) {}

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
    int bike_health = frame.getQuality() + suspension.getQuality() + brakes.getQuality() + wheels.getQuality();
    int player_health = player.getStrength() + player.getSkill() + player.getEndurance() + player.getMental();
    // applying modified bike parts back to player
    player.setPurchase(frame,1);
    player.setPurchase(suspension,2);
    player.setPurchase(brakes,3);
    player.setPurchase(wheels,4);
    return false;
}

bool Game::eat() {
    if(player.getSnacks() > 0) {
        double rate = (30 + double(rand() % 20)) / 100.0;
        player.modStrength(rate);
        player.modSkill(rate);
        player.modEndurance(rate);
        player.modMental(rate);
        player.addSnacks(-1);
        system("clear");
        printStatus(player);
        return true;
    }
    return false;
}
bool Game::repair() {
    srand(time(NULL));
    if(player.getToolkits() > 0) {
        double rate = 1 + rand() % 3;
        player.modFrame(rate);
        rate = 5 * (1 + rand() % 3);
        player.modSuspension(rate);
        rate = 5 * (1 + rand() % 3);
        player.modBrakes(rate);
        rate = 5 * (1 + rand() % 3);
        player.modWheels(rate);
        // player.addToolkits(-1);
        system("clear");
        printStatus(player);
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
        cout << "It looks like you do not have enough funds to make this purchase!" << endl << "Please edit your cart and try again" << endl;
        loadingScreen("Heading back to shop");
        return false;
    }
}

int Game::getCheckpoint() {
    return checkpoint_;
}
void Game::setCheckpoint(int new_checkpoint) {
    checkpoint_ = new_checkpoint;
}


// Series of Functions for user input and output reset.
/*
loadingScreen() - outputs an input string by displaying each letter one at a time to give a typing effect

continueGame() - calls the userInput function with the maximum number of options. Prompts the user to input any number to continue

userInput() - takes a number of options and asks the user to select one. does not require the "enter" key. Returns user input

directionInput() - prompts the user for a (w a s d) direction or 0 to return. Used in the map function. does not require the "enter" key. returns user input
*/
void Game::loadingScreen(string direction) {
    double seconds = .01;
    double micro_seconds = 1000000;
    double sleep_duration = seconds * micro_seconds;
    cout << endl;
    for (int j = 0; j < direction.length();j++) {
        cout << direction[j];
        cout.flush();
        usleep(sleep_duration);
    }
    for(int i = 0; i < (rand() % 6 + 3);i++) {
        cout << ".";
        cout.flush();
        usleep(sleep_duration * 5);
    }
    usleep(sleep_duration * 10);

    system("clear");
    cin.clear();
    printStatus(player);
}

int Game::continueGame() {
    return userInput(10);
}

int Game::userInput(int choices) {
    // code to take user input without having to press enter! Change system mode to raw and back to normal 
    // Output prompt
    if(choices == 10) {
        cout << endl << "Press any number to continue";
    }
    else {
        cout << endl << "Select a choice to CONTINUE";
    }
    cout << endl << "Hit ESC to RESTART GAME" << endl;
    system("stty raw");
    bool valid = false; 
    bool prompt = false;
    char input;
    //Input Validation and line deletion so we do not print "invalid" multiple times on screen
    while (!valid) {
        // Get single character input
        input = getchar();
        if (input == 27) {
            for(int i = 0; i < 3; i++) {
                printf("\033[A");
                printf("\33[2K\r");
            }
            system("stty cooked");
            cout << endl << "Are you sure you want to quit? Any progress since your last save will be lost" << endl;
            cout << menuBox("1. Yes | 0. No",1);
            system("stty raw");
            while(input < 47 || input > 50) {
                input = getchar();
                if(input == 49) {
                    system("clear");
                    system("stty cooked");
                    system("g++ -std=c++17 mtbRPG.cpp Shop.cpp Items.cpp Game.cpp Racer.cpp Minigame.cpp Map.cpp");
                    system("./a.out");
                    exit(0);
                }
                else if(input == 48) {
                    prompt = false;
                    for(int i = 0; i < 2; i++) {
                    printf("\033[A");
                    printf("\33[2K\r");
                    }
                }
            }
        }
        else if ((input > 47 && input <= choices + 47)) {
            valid = true;
        }
        if(!prompt) {
            printf("\033[A");
            printf("\33[2K\r");
            printf("\033[A");
            printf("\33[2K\r");
            // Input validation, if incorrect, cout "Please input 1, 2, 3.. or n"
            char i = 48;
            int leftover = choices - 1;;
            cout << "Press " << i++;
            while (leftover > 0) {
                if (leftover == 1) {
                    cout << " or " << i;
                }
                else {
                    cout << ", " << i++;
                };
                leftover--;
            }
            cout << " to CONTINUE";
            printf("\033[B\r");
            cout << "Press ESC to RESTART GAME";
            printf("\033[B\r");
            prompt = true;
        }
    }
    // Reset terminal to normal mode 
    system("stty cooked");
    cout.flush();
    system("clear");
    if(player.getName() != "") {
        printStatus(player);
    }
    return (int)input - 48;
}

char Game::directionInput() {
    // code to take user input without having to press enter! Change system mode to raw and back to normal 
    // Output prompt
    cout << endl << "Enter A Direction To MOVE, 0 to REST";
    cout << endl << "Hit ESC to RESTART GAME" << endl;
    system("stty raw");
    bool valid = false; 
    bool prompt = false;
    char input;
    //Input Validation and line deletion so we do not print "invalid" multiple times on screen
    while (!valid) {
        // Get single character input
        input = getchar();
        if (input == 27) {
            for(int i = 0; i < 3; i++) {
                printf("\033[A");
                printf("\33[2K\r");
            }
            system("stty cooked");
            cout << endl << "Are you sure you want to quit? Any progress since your last save will be lost" << endl;
            cout << menuBox("1. Yes | 0. No",1);
            system("stty raw");
            while(input < 48 || input > 49) {
                input = getchar();
                if(input == 49) {
                    system("clear");
                    system("stty cooked");
                    system("g++ -std=c++17 mtbRPG.cpp Racer.cpp Game.cpp Shop.cpp Map.cpp Items.cpp Minigame.cpp");
                    system("./a.out");
                    exit(0);
                }
                else if(input == 48) {
                    prompt = false;
                    for(int i = 0; i < 2; i++) {
                    printf("\033[A");
                    printf("\33[2K\r");
                    }
                }
            }
        }
        else if ((tolower(input) == 'w' || tolower(input) == 'a' || tolower(input) == 's' || tolower(input) == 'd')) {
            input = tolower(input);
            break;
        }
        else if(input == 48) {
            break;
        }
        if(!prompt && !valid) {
            printf("\033[A");
            printf("\33[2K\r");
            printf("\033[A");
            printf("\33[2K\r");
            // Input validation, if incorrect, cout
            cout << "Press w, a, s, or d to CONTINUE, 0 to REST";
            printf("\033[B\r");
            cout << "Press ESC to RESTART GAME";
            printf("\033[B\r");
            prompt = true;
        }
    }
    cout.flush();
    cin.clear();
    // Reset terminal to normal mode 
    system("clear");
    system("stty cooked");
    printStatus(player);
    return input;
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
                cout << endl << "A save file for " << save_name << " already exists. Saving will overwrite any previous data.\nAre you sure you want to continue?" << endl;
                cout << menuBox("1. Yes | 0. No",1);
                overwrite = userInput(2);
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
        fs::create_directory("./saves/");
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
            fout << part.getName() << "," << part.getPrice() << "," << part.getQuality() << endl;
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
            fout << save.getNumCols() << "," << save.getNumRows() << "," << save_name << " width/height" << endl; // map width and height
            for(int y = 0; y < save.getNumRows();y++) {
                for(int x = 0; x < save.getNumCols()-1;x++) {
                    fout << save.getMapArea(x,y); // map area
                }
                fout << "\n";
            }
            for(int y = 0; y < save.getNumRows();y++) {
                for(int x = 0; x < save.getNumCols();x++) {
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
        
        loadingScreen("Game Saved");
    }
    fout.close();
}

void Game::loadGame() {
    ifstream fin;
    string load_name;
    string menu_list = "Choose A Save File To Load\n \n";
    vector<string> load_list;
    int i = 0;
    bool overwrite = true;
    fin.open("./saves/savelist.txt");
    if(!fin.fail()) {
        getline(fin,load_name);
        while(!fin.eof()) {
            menu_list += to_string(++i) + ". " + load_name + " \n";
            load_list.push_back(load_name);
            getline(fin,load_name);
        }
        if(i == 0) {
            cout << "No saves available" << endl;
            loadingScreen("Heading back to menu");
        }
        else {
            menu_list += " \n0. Go Back";
            cout << menuBox(menu_list,0);
            int choice = userInput(i + 1);
            if(choice == 0) {
                return;
            }
            load_name = load_list.at((choice-1));
        }
    }
    fin.close();
    fin.open("./saves/" + load_name + ".txt");
    string value;
    string line[5];
    vector<int> saved_tires;
    bool loaded = false;
    int loop = 0;
    static const int count = 0;
    if(!fin.fail()) {
        if(fin.fail()) {
            return;
        }
        while(!loaded) {
            getline(fin,value);
            split(value,',',line,5);
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
                    for(int category = 1; category < 5;category++) {
                        Items part = Items(line[0],stoi(line[1]),stoi(line[2]));
                        player.setPurchase(part,category);
                        getline(fin,value);
                        split(value,',',line,5);
                    }
                    loop++; // No break statement, we already did a getline
                case count + 11: // Input all tire healths
                    for(int j = 0;j < player.MAX_TIRES;j++) {
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
                        for(int rise = 0;rise < load.getNumRows();rise++) {
                            getline(fin,value);
                            int index = 0;
                            for (int run = 0;run < load.getNumCols()-1;run++) {
                                bool valid = false;
                                if(value[index++] == '1') {
                                    valid = true;
                                }
                                load.inputMapArea(run,rise,valid); // load base map data per character
                            }
                        }
                        char input_data;
                        for(int rise = 0;rise < load.getNumRows();rise++) {
                            for (int run = 0;run < load.getNumCols();run++) {
                                if(rise != load.getNumRows() && run != load.getNumCols()) {
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
                default:
                    loaded = true;
                    break;
            }
            loop++;
        }
        loadingScreen("Game Loading");
    }
    else {
        loadingScreen("Could not locate save file. File may be lost or corrupt");
    }
}


// Series of functions from other inherited classes that require functions from "funcs.h". i.e. split and menuBox
int Minigame::readfeatures(string filename) {
    ifstream fin;
    string image = "";
    num_features = 0;
    fin.open("./txt/" + filename);
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
    fin.open("./txt/starts.txt");
    if(fin.fail()) {
        return -1;
    }
    int start_num = 0;
    while(start_num < 5 && !fin.eof()) {
        getline(fin, image);
        string first_char = image.substr(0,1);
        if(image.substr(0,1) != "\xe2") {
            starts_[start_num] = image;
            start_num++;
        }
    }
    fin.close();
    return num_features;
}

int Game::readRaces(string filename) {
    ifstream fin;
    string line = "";
    fin.open("./txt/" + filename);
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

int Shop::readInventory(string filename) {
    ifstream fin;
    string line;
    string current_line[4];
    int pieces = 0;
    int category = 0;

    fin.open("./txt/" + filename);
    
    if(fin.fail()) {
        cout << "Shop file input failed!" << endl;
    }
    else {
        while(!fin.eof()) {
            getline(fin, line);
            pieces = split(line,',',current_line,3);
            if(pieces == 3) {
                Items item(current_line[0],stod(current_line[1]),stoi(current_line[2]));
                switch(category) {
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
                category++;
            }
            
        }
    }
    return 0;
}

vector<Items> Shop::displayInventory(int category) {
    string output;
    string title;
    vector<Items> displayed;
    if (category == 1) {
        title += "Frames";
        displayed = frames_;
    }
    if (category == 2) {
        title += "Suspension";
        displayed = suspension_;
    }
    if (category == 3) {
        title += "Brakes";
        displayed = brakes_;
    }
    if (category == 4) {
        title += "Wheels";
        displayed = wheels_;
    }
    output += menuBox(title,1);
    for(int i = 0;i < displayed.size();i++) {
        output += to_string(i + 1) + ". ";
        output += displayed.at(i).displayItem(multiplier_);
    }
    output += " \n6. Clear " + title.substr(0,title.length()-1);
    output += "\n0. Go Back";
    cout << menuBox(output,0);
    return displayed;
}


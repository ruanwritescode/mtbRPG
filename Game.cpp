#include "Game.h"
#include "funcs.h"
#include <string>

// #include <iostream>

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
    int choice = 1;
    while (choice != 0) {
        menuBox("1. Load Game | 2. New Game | 0. Terminate Program");
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

void Game::initializeMaps() {
    usa = Map("usa");
    europe = Map("europe");
}

int Game::setPlayerName(string input) {
    player.setName(input);
    return 0;
}

void Game::printStatus(Racer racer) {
    if(player.getName() != "") {
        cout << player.racerStats();
        for(int i = 0; i < 3;i++) {
            if (team_[i].getName() != "") {
                cout << team_[i].racerStats();
            }
        }
        menuBox("INVENTORY");
        cout <<"Bank Account $" << fixed << setprecision(2) << getMoney() << endl << endl;
        player.bikeStats();
        player.consumableStats();
        for(int j = 0;j < racer.racerStats().length();j++) {
            cout << "-";
        }
        cout << endl;
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
    double parts_tab = 0;
    int tab = 0;
    double multiplier = bikeshop_.getMultiplier();
    bool exit = 0;
        cout << "Welcome to the level " << level_ << " bike shop! What are you looking for today?" << endl << endl;
    while(!exit) {
        menuBox("Current Cart\nTotal: $" + to_string(tab));
        bikeshop_.displayCart(cart, player, cart_tires);
        menuBox("Pick A Department\n \n1. PARTS | 2. TOOLKITS | 3. SNACKS | 0. VIEW CART/CHECKOUT");
        department = userInput(4);
        while(true) {
        // Department 1 for bike parts
            if(department == 1) {
                menuBox("Current Cart\nTotal: $" + to_string(tab));
                bikeshop_.displayCart(cart, player, cart_tires);
                menuBox("Parts\n \n1. FRAMES | 2. SUSPENSION | 3. BRAKES | 4. WHEELS | 5. TIRES | 0. GO BACK");
                category = userInput(6);
                if(category == 0) {
                    break; // Category 0 returns to bike shop main menu
                }
                else {
                    while(true) { // Enter category for parts choice
                        if(category == 5) // Tires as a consumable
                        {
                            if(player.getNumTires() >= player.MAX_TIRES) {
                                cout << "Looks like you're all maxed out on tires!";
                                loadingScreen("Heading back to shop");
                            }
                            else {
                                int remaining_tires = player.MAX_TIRES - player.getNumTires();
                                int tire_price = bikeshop_.getTirePrice() * multiplier;
                                menuBox("Tires - $" + to_string(tire_price) + " each \nHow many tires would you like in your cart?\nMAXIMUM " + to_string(remaining_tires));
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
                            selection = bikeshop_.displayInventory(category);
                            int options = selection.size() + 1;
                            purchase = userInput(options) - 1;
                            if(purchase == -1) {
                                break;
                            }
                            else {
                                Items new_purchase = selection.at(purchase);
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
            }
            // Departments 2 and 3 for Toolkits and Snacks
            if(department == 2 || department == 3) {
                int max_items;
                string dep_name;
                int dep_price;
                if(department == 2) {
                    max_items = player.MAX_TOOLS - player.getToolkits();
                    dep_name = "Toolkits";
                    dep_price = bikeshop_.getToolPrice() * multiplier;
                }
                else if (department == 3) {
                    max_items = player.MAX_SNACKS - player.getSnacks();
                    dep_name = "Snacks";
                    dep_price = bikeshop_.getSnackPrice() * multiplier;
                }
                if(max_items > 0) {
                    menuBox("Current Cart\nTotal: $" + to_string(tab));
                    bikeshop_.displayCart(cart, player, cart_tires);
                    menuBox(dep_name + " - $" + to_string(dep_price) + " each \n \nENTER AN AMOUNT TO UPDATE CART\n \nMAXIMUM " + to_string(max_items));
                    purchase = userInput(max_items + 1);
                    dep_name[0] = tolower(dep_name[0]);
                    if(department == 2) {
                        tab -= (cart.getToolkits() - player.getToolkits()) * dep_price;
                        cart.setToolkits(player.getToolkits() + purchase);
                    }
                    else if(department == 3) {
                        tab -= (cart.getToolkits() - player.getToolkits()) * dep_price;
                        cart.setSnacks(player.getSnacks() + purchase);
                    }
                    tab += purchase * dep_price;
                    cart.unlockConsumables(true);
                    cout << "Your cart has been updated to " << purchase << " " << dep_name << "(s) for $" << dep_price;
                }
                else {
                    dep_name[0] = tolower(dep_name[0]);
                    cout << "Looks like you're all maxed out on " << dep_name;
                }
                if(confirmation) {
                    loadingScreen("Heading back to shop");
                    break;
                }
            }
            // Department 0 for Exiting bike shop
            if(department == 0) {
                menuBox("Current Cart\nTotal: $" + to_string(tab));
                bikeshop_.displayCart(cart, player, cart_tires);
                cout << endl << "Total: $" << tab << endl;
                cout << endl << "Confirm Purchase?" << endl;
                menuBox("1. Yes | 0. No");
                exit = userInput(2);
                if(!setMoney(tab)) {
                    exit = 0;
                }
                break;
            }
        }
    }
    cart.addTires(cart_tires,money_,multiplier);
    player = cart;
    loadingScreen("Heading back to Main Menu");
}

void Game::mainMenu() {
    bool exit = 0;
    while(!exit) {
        menuBox("1. Open Map | 2. Enter Shop | 0. Save Game");
        int option = userInput(3);
        if(option == 0) {
            saveGame();
        }
        else if(option == 1) {
            openMap();
        }
        else if(option == 2) {
            shop();
        }
    }
}

void Game::openMap() {
    system("clear");
    printStatus(player);
    Map map;
    if(level_ < 6) {
        map = usa;
    }
    else {
        map = europe;
    }
    while(true) {
        char direction;
        cout << "On a shop space? ..." << map.isShopLocation(map.getPlayerX(), map.getPlayerY()) << endl;
        cout << "On a race space? ..." << map.isRaceLocation(map.getPlayerX(),map.getPlayerY()) << endl;
        cout << map.getShopCount() << endl;
        map.displayMap();
        direction = directionInput();
        // cin >> direction;
        if(direction == 48) {
            break;
        }
        else if(direction == 49) {
            int spot = map.exploreSpace(map.getPlayerX(),map.getPlayerY());
            system("clear");
            if(spot == 1) {
                cout << "It looks like you've found a bike shop!" << endl;
                menuBox("1. Enter | 0. Leave");
                bool choice = userInput(2);
                if(choice) {
                    shop();
                }
            }
        }
        else {
            map.move(direction);
        }
    }
    if(level_ < 6) {
        usa = map;
    }
    else {
        europe = map;
    }
}

void Game::ride() {

}

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
                menuBox("1. Yes | 0. No");
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
            menu_list += to_string(++i) + ". " + load_name + " | ";
            load_list.push_back(load_name);
            getline(fin,load_name);
        }
        if(i == 0) {
            cout << "No saves available" << endl;
            loadingScreen("Heading back to menu");
        }
        else {
            menu_list += "0. Go Back";
            menuBox(menu_list);
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

int Game::getCheckpoint() {
    return checkpoint_;
}
void Game::setCheckpoint(int new_checkpoint) {
    checkpoint_ = new_checkpoint;
}

// for any user input required. Uses an input for a number of choices and outputs the user input as an integer. Does not require "enter" key.
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
            menuBox("1. Yes | 0. No");
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
    cout << endl << "Enter A Direction To MOVE, 1 to EXPLORE, 0 to GO BACK";
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
            menuBox("1. Yes | 0. No");
            system("stty raw");
            while(input < 47 || input > 50) {
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
        else if(input == 49 || input == 48) {
            break;
        }
        if(!prompt && !valid) {
            printf("\033[A");
            printf("\33[2K\r");
            printf("\033[A");
            printf("\33[2K\r");
            // Input validation, if incorrect, cout
            cout << "Press w, a, s, or d to CONTINUE, 1 to EXPLORE, 0 to GO BACK";
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
            terrain_choices[num_features] = image.substr(1);
            num_features++;
        }
        else {
            terrain_[num_features] += image + "\n";
        }
    }
    return num_features;
}

int Minigame::readRaces(string filename) {
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
                races.push_back(read_race[0]);
                race_level.push_back(stoi(read_race[1]));
            }
        }
    }
    return races.size();
}

int Minigame::getModifiers(int feature) {
        return split(terrain_choices[feature],',',modifiers,3);
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



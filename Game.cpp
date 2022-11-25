#include "Game.h"
#include "funcs.h"
#include <string>
#include <filesystem>
namespace fs = std::filesystem;
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
        status = menuBox(status,1);
        status += "Points  " + to_string(player.getPoints()) + "\n" + menuBox("INVENTORY",1);
        status += "Bank Account  $" + to_string((int)getMoney()) + "\n";
        if(player.arePartsUnlocked()) {
            status += menuBox(player.bikeStats(),1);
        }
        else {
            status += " \n";
        }
        if(player.areConsumablesUnlocked()) {
            status +=  player.consumableStats();
        }
        cout << menuBox(status,1);
        cout << endl;
    }
}

void Game::mainMenu() {
    bool exit = 0;
    while(!exit) {
        cout << menuBox("1. Open Map | 2. Enter Shop\n \n0. Save Game",1);
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
                        if(player.getBikePart(c).getPrice() > 0) {
                            equity += (player.getBikePart(c).getPrice() - cart.getBikePart(c).getPrice()) * player.getBikePart(c).getQuality()/100;
                        }
                    }
                    cout << menuBox("Current Cart\nTotal: $" + to_string(tab),1);
                    bikeshop_.cart(cart, player, cart_tires);
                    cout << endl << "Total: $" << tab << endl << endl;
                    cout << "Any old parts will be sold on the used market for $" << equity << endl;
                    cout << endl << "Confirm Sale of old parts and purchase new parts?" << endl;
                    cout << menuBox("1. Yes | 0. No",1);
                    exit = userInput(2);
                    if(exit && !setMoney(tab)) {
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
                            cout << menuBox("Tires - $" + to_string(tire_price) + " each \nHow many tires would you like in your cart?\nMAXIMUM " + to_string(remaining_tires),1);
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
                            tab -= cart.getBikePart(category).getPrice();
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
                    cout << menuBox("Current Cart\nTotal: $" + to_string(tab),1);
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

void Game::openMap() {
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
        cout << menuBox("MAP KEY\nX = Player | R = Race | S = Shop | % = Final Race",1);
        map.displayMap();
        direction = directionInput();
        // cin >> direction;
        if(direction == 48) {
            break;
        }
        else if(direction == 49) {
            if(map.isExplored(map.getPlayerX(),map.getPlayerY())) {
                loadingScreen("It looks like you have already explored this location!\n \nHeading back to map");
            }
            int spot = map.exploreSpace(map.getPlayerX(),map.getPlayerY());
            if(spot == 1) {
                cout << "There seems to be a bike shop at this location.\n\nwould you like to purchase new items?\n" << endl;
                cout << menuBox("1. Enter | 0. Skip",1);
                bool choice = userInput(2);
                if(choice) {
                    shop();
                }
            }
            if(spot == 2) {
                if(level_ != 0) {
                    cout << "There is a race happening at this location now! Would you like to join?" << endl;
                    cout << menuBox("1. Enter Race | 0. Skip",1);
                    bool choice = userInput(2);
                    if(choice) {
                        ride(level_);
                    }
                }
                map.removeRace(x,y);
            }
        }
        else {
            map.move(direction);
            x = map.getPlayerX();
            y = map.getPlayerY();
            if(map.isShopLocation(x,y)) {
                cout << "It looks like there's a bike shop here!\n\nWould you like to go in?\n" << endl;
                cout << menuBox("1. Enter | 0. Skip",1);
                bool choice = userInput(2);
                if(choice) {
                    shop();
                    map.removeShop(x,y);
                }
            }
            if(map.isRaceLocation(x,y)) {
                ride(level_ + 1);
            }
            if(map.isFinalRace(x,y)) {
                if(level_ == final_level){

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
}

bool Game::ride(int required_level) {
    if(player.getBikePart(1).getName() == "" || player.getBikePart(2).getName() == "" || player.getBikePart(3).getName() == "" || player.getBikePart(4).getName() == "" || player.getNumTires() == 0) {
        cout << "Looks like you are missing some parts to complete your bike!\n Head back to the shop to get what you still need" << endl;
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
        level_++;
        return false; // If there are no more races left for the current level.
    }
    int race_num = rand() % available_races.size();
    Minigame current_race = races.at(available_races.at(race_num));

    //delares a variable to be used to determine user input choices
    int options = current_race.getNumFeatures();
    string old_positions;
    int position = rand() % options;
    for(int i = 0; i < current_race.getLength(); i++) {
        srand(time(NULL));
        cout << menuBox(current_race.getName(),1) << endl;
        cout << current_race.getTerrain(position);
        cout << "\n0. To Quit Race" << endl;
        int choice = userInput(current_race.getChoices(position) + 1);
        if(!choice) {
            cout << "You are about to quit this race and lose all progress.\n\nAre you sure you want to continue?" << endl;
            cout << menuBox("1. Yes | 0. No ",1);
            if(userInput(2)) {
                loadingScreen("Exiting Race");
                break;
            }
        }
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
    return true;
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
            cout << menuBox(menu_list,1);
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
    cout << endl << "Enter A Direction To MOVE, 1 to EXPLORE, 0 to RETURN TO MAIN MENU";
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
            cout << "Press w, a, s, or d to CONTINUE, 1 to EXPLORE, 0 to RETURN TO MAIN MENU";
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

string Minigame::getModifiers(int feature) {
        return modifiers[feature][0];
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



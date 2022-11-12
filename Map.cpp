#include "Map.h"
#include <fstream>

using namespace std;
Map::Map() {
    resetMap("empty");
    map_max_shops_ = 0;
}

Map::Map(string zone)
{
    srand(time(NULL));
    resetMap(zone);
    spawnRaces();
    spawnShops();
}

/*
 * Algorithm: Resets positions of player, Shops, and shops and clears map_data_
 * Set Player position coordinates to 0
 * Set shop_count_ to false
 * Set race_count_ to 0
 * loop i from 0 to max_shops_
 *      Set y andy of location to -1
 * loop i from 0 to max_shops
 *      Set y andy of shop location to -1
 * loop i from 0 to height
 *      loop j from 0 to width
 *          Set (i,j) location on map_data_ to '-'
 * Parameters: none
 * Return: nothing (void)
 */
void Map::resetMap(string zone)
{
    for (int i = 0; i < max_shops_; i++)
    {
        shop_locations_[i][0] = 0;
        shop_locations_[i][1] = 0;
    }
    shop_count_ = 0;

    for (int i = 0; i < max_races_; i++)
    {
        race_locations_[i][0] = 0;
        race_locations_[i][1] = 0;
    }
    race_count_ = 0;

    ifstream mapin;
    char map_point;
    mapin.open("./txt/" + zone + ".txt");
    int rise = 0;
    int run = 0;
    if(!mapin.fail()) {
        // resets player position, count values, and initializes values in position arrays to -1
        mapin.get(map_point);
        string coor;
        int step = 0;
        do {
            if(map_point == ',') {
                switch(step++) {
                    case 0:
                        player_position_[0] = stoi(coor);
                        break;
                    case 1:
                        player_position_[1] = stoi(coor);
                        break;
                    case 2:
                        final_race[0] = stoi(coor);
                        break;
                    case 3:
                        final_race[1] = stoi(coor);
                        break;
                    case 4:
                        map_max_shops_ = stoi(coor);
                        break;
                    default:
                        break;
                }
                coor = "";
            }
            else {
                coor = coor + map_point;
            }
            mapin.get(map_point);
        } while(map_point != '\n');

        while(!mapin.eof()) {
            mapin.get(map_point);
            map_data_[run][rise] = map_point;
            if(map_point == ' ') {
                map_area_[run][rise] = true;
            }
            else {
                map_area_[run][rise] = false;
            }
            if(map_point == '\n') {
                run = 0;
                rise++;
            }
            else {
                run++;
            }
        }
        width = run + 1;
        height = rise + 1;
    }
    else {
        cout << "Map input failed";
        cin >> width;
    }
    mapin.close();
    map_data_[player_position_[0]][player_position_[1]] = EXPLORED;
    map_data_[final_race[0]][final_race[1]] = FINAL;
}

// return player's x position
int Map::getPlayerX()
{
    return player_position_[0];
}

// return player's y position
int Map::getPlayerY()
{
    return player_position_[1];
}

// return current shop count
int Map::getRaceCount()
{
    return race_count_;
}

// return current shop count
int Map::getShopCount()
{
    return shop_count_;
}
// return dungeon exit y
int Map::getFinalX()
{
    return final_race[0];
}

// return dungeon exity
int Map::getFinalY()
{
    return final_race[1];
}

// set player position, if in range
void Map::setPlayerPosition(int x, int y)
{
    if (isOnMap(x,y))
    {
        player_position_[0] = x;
        player_position_[1] = y;
    }
}

// set dungeon exit position, if in range
void Map::setFinalRace(int x, int y)
{
    if (isOnMap(x,y))
    {
        final_race[0] = x;
        final_race[1] = y;
    }
}

// returns member variable height
int Map::getNumRows()
{
    return height;
}

void Map::setHeight(int input_height) {height = input_height;}

// returns member variable width
int Map::getNumCols()
{
    return width;
}

void Map::setWidth(int input_width) {width = input_width;}

bool Map::isOnMap(int x, int y)
{
    if ( x <= width && y <= height && map_area_[x][y] == true)
    {
        return true;
    }
        return false;
}

/*
 * Algorithm: Checks if the location is an Shop location
 * if (x,y) is not within the map boundaries
 *      return false
 * loop i from 0 to shop_count_
 *      if (x,y) is a npc location
 *          return true
 * return true
 * Parameters: y (int),y (int)
 * return false
 * Parameters: none
 * Return: boolean (bool)
 */
bool Map::isShopLocation(int x, int y)
{
    if (!isOnMap(x,y))
    {
        return false;
    }
    for (int i = 0; i < shop_count_; i++)
    {
        if (x == shop_locations_[i][0] && y == shop_locations_[i][1])
        {
            return true;
        }
    }
    return false;
}

/*
 * Algorithm: Checks if the location is an shop location
 * if (x,y) is not within the map boundaries
 *      return false
 * loop i from 0 to race_count_
 *      if (x,y) is a shop location
 *          return true
 * return true
 * Parameters: y (int),y (int)
 * return false
 * Parameters: none
 * Return: boolean (bool)
 */
bool Map::isRaceLocation(int x, int y)
{
    if (!isOnMap(x,y))
    {
        return false;
    }
    for (int i = 0; i < race_count_; i++)
    {
        if (x == race_locations_[i][0] && y == race_locations_[i][1])
        {
            return true;
        }
    }
    return false;
}

/*
 * Algorithm: Checks if the given y andyumn is an explored space
 * if (x,y) is not on the map:
 *     return false
 * if map_data_[x][y] is ' ':
 *     return true
 * if (x,y) is npc location and has been found:
 *     return true
 * else:
 *     return false
 */
bool Map::isExplored(int x, int y)
{
    if (!isOnMap(x,y))
    {
        return false;
    }
    if (map_data_[x][y] == EXPLORED)
    {
        return true;
    }
    for (int i = 0; i < shop_count_; i++)
    {
        if (shop_locations_[i][0] == x && shop_locations_[i][1] == y)
        {
            if (shop_locations_[i][2] == true)
            {
                return true;
            }
            break;
        }
    }
    return false;
}

/*
 * Algorithm: checks if (x,y) is final_race
 *
 */
bool Map::isFinalRace(int x, int y)
{
    if (x == final_race[0] && y == final_race[1])
    {
        return true;
    }
    return false;
}

/*
 * Algorithm: Checks if the given y andyumn on map is a free space
 * if y andyumn is not within the map boundaries
 *      return false
 * if y andyumn is a npc location
 *      return false
 * if y andyumn is a shop location
 *      return false
 * if y andyumn is the dungeon exit
 *      return false
 * return true
 *
 * Parameters: y (int),y (int)
 * Return: boolean (bool)
 */
bool Map::isFreeSpace(int x, int y)
{
    if (!isOnMap(x,y))
    {
        return false;
    }
    if (isExplored(x,y))
    {
        return false;
    }
    if (isShopLocation(x,y))
    {
        return false;
    }
    if (isRaceLocation(x,y))
    {
        return false;
    }
    if (isFinalRace(x,y))
    {
        return false;
    }
    return true;
}

void Map::setMaxShops(int max_shops) {
    map_max_shops_ = max_shops;
}
/*
 * Algorithm: Create an Shop on the map
 * if npc is present on map
 *      return false
 * if (x,y) is not a free space
 *      return false
 * store y andy values in npcPosition array
 * mark Shop as hidden
 * set (x,y) value in map_data_ to 'N'
 * increment shop_count_
 * return true
 *
 * Parameters: y (int),y (int)
 * Return: boolean (bool)
 */
bool Map::addShop(int x, int y, int found)
{
    if (shop_count_ >= map_max_shops_)
    {
        return false;
    }
    if (!isFreeSpace(x,y))
    {
        return false;
    }
    else if(isOnMap(x+1,y) && isOnMap(x-1,y) && isOnMap(x,y+1) && isOnMap(x,y-1)) {
        shop_locations_[shop_count_][0] = x;
        shop_locations_[shop_count_][1] = y;
        shop_locations_[shop_count_][2] = found;
        map_data_[x][y] = SHOP;
        shop_count_++;
        return true;
    }
    return false;
}

void Map::spawnShops() {
    while(shop_count_ < map_max_shops_/2) {
        int x = 1 + rand() % (width - 2);
        x = x - 1 + (x % 2);
        int y = 1 + rand() % (height- 2);
        addShop(x,y,false);
    }
}

/*
 * Algorithm: Create a shop on the map
 * if race_count_ is more than or equal to number of shops
 *      return false
 * if (x,y) is not a free space
 *      return false
 * if next y in race_locations_ matrix is -1 -1
 *      store xy and type values in the current y of race_locations_ matrix
 *      increment race_count_
 *      Set (x,y) value in map_data_ to 'R'
 *      return true
 *
 * Parameters: y (int),y (int)
 * Return: boolean (bool)
 */
bool Map::addRace(int x, int y)
{

    if (race_count_ >= max_races_)
    {
        return false;
    }

    // location must be blank to spawn
    if (!isFreeSpace(x,y))
    {
        return false;
    }
    if(isFreeSpace(x+1,y) && isFreeSpace(x-1,y) && isFreeSpace(x,y+1) && isFreeSpace(x,y-1)) {
        race_locations_[race_count_][0] = x;
        race_locations_[race_count_][1] = y;
        race_count_++;
        map_data_[x][y] = RACE;
        return true;
    }
    return false;
}

void Map::spawnRaces() {
    int left_limit = 1;
    while(race_count_ < max_races_) {
        int x = left_limit + rand() % (width/(max_races_+1));
        x = x - 1 + (x % 2);
        int y = (1 + rand() % (height - 2));
        if(addRace(x,y)) // Helps to distribute races across 4 vertical zones
        {
            left_limit += width/max_races_;
        }
    }
}

/*
 * Algorithm: Removes the Shop at (x,y) from the map
 * loop i from 0 to shop_count_
 *      if shop_location[i] is (x,y)
 *          swap shop_location[shop_count_-1] with shop_location[i]
 *          reset shop_location[shop_count_-1][0] and shop_location[shop_count_-1][1] to -1
 *          reset shop_location[shop_count_-1][2] to 0
 *          decrement shop_count_
 *          set map data at (x,y) to explored
 *          return true
 * return false
 *
 * Parameters: y (int),y (int)
 * Return: boolean (bool)
 */
bool Map::removeShop(int x, int y)
{
    for (int i = 0; i < shop_count_; i++)
    {
        if (shop_locations_[i][0] == x && shop_locations_[i][1] == y)
        {
            // swap i'th npc with last npc
            shop_locations_[i][0] = shop_locations_[shop_count_ - 1][0];
            shop_locations_[i][1] = shop_locations_[shop_count_ - 1][1];
            shop_locations_[i][2] = shop_locations_[shop_count_ - 1][2];
            // reset last npc
            shop_locations_[shop_count_ - 1][0] = -1;
            shop_locations_[shop_count_ - 1][1] = -1;
            shop_locations_[shop_count_ - 1][2] = false;
            // decrement shop_count_
            shop_count_--;
            // set map data to explored
            map_data_[x][y] = EXPLORED;
            return true;
        }
    }
    return false;
}

/*
 * Algorithm: Removes the shop at (x,y) from the map
 * loop i from 0 to race_count_
 *      if shop_position[i] is (x,y)
 *          swap shop_position[race_count_-1] with shop_position[i]
 *          reset shop_position[race_count_-1][0] and shop_position[race_count_-1][1] to -1
 *          decrement race_count_
 *          set map data at (x,y) to explored
 *          return true
 * return false
 *
 * Parameters: y (int),y (int)
 * Return: boolean (bool)
 */
bool Map::removeRace(int x, int y)
{
    for (int i = 0; i < race_count_; i++)
    {
        if (race_locations_[i][0] == x && race_locations_[i][1] == y)
        {
            // swap i'th shop with last shop
            race_locations_[i][0] = race_locations_[race_count_ - 1][0];
            race_locations_[i][1] = race_locations_[race_count_ - 1][1];
            // reset last shop
            race_locations_[race_count_ - 1][0] = -1;
            race_locations_[race_count_ - 1][1] = -1;
            // decrement race_count_
            race_count_--;
            // set map data to explored
            map_data_[x][y] = EXPLORED;
            return true;
        }
    }
    return false;
}

/*
 * Algorithm: Mark (x,y) as explored, either revealing Shop or empty space
 * if (x,y) is Shop location
 *      mark npc at player_position_ as found
 * else if (x,y) is a free space
 *      mark space as explored in map data
 *
 * Parameters: y (int),y (int)
 * Return: boolean (bool)
 */
void Map::visited(int x, int y)
{
    for (int i = 0; i < shop_count_; i++)
    {
        if (x == shop_locations_[i][0] && y == shop_locations_[i][1])
        {
            // mark Shop as found
            shop_locations_[i][2] = 1;
            return;
        }
    }
    if (isFreeSpace(x,y))
    {
        map_data_[player_position_[0]][player_position_[1]] = HISTORY;
    }
}

/*
 * Algorithm: Make the player move based on the given command
 * if user inputs w and if its not the top y of the map
 *      Move the player up by one y
 * if user inputs s and if its not the bottom y of the map
 *      Move the player down by one y
 * if user inputs a and if its not the leftmostyumn
 *      Move the player left by oneyumn
 * if user inputs d and if its not the rightmostyumn
 *      Move the player right by oneyumn
 * if player moved
 *      if new location is an Shop location
 *          mark new location as explored
 *      return true
 * else
 *      return false
 *
 * Parameters: direction (char)
 * Return: boolean (bool)
 */
bool Map::move(char direction)
{
    // check input char and move accordingly
    switch (tolower(direction))
    {
    case 'w': // if user inputs w, move up if it is an allowed move
        if (isOnMap(player_position_[0],player_position_[1]-1))
        {
            player_position_[1] -= 1;
        }
        else
        {
            return false;
        }
        break;
    case 's': // if user inputs s, move down if it is an allowed move
        if (isOnMap(player_position_[0],player_position_[1]+1))
        {
            player_position_[1] += 1;
        }
        else
        {
            return false;
        }
        break;
    case 'a': // if user inputs a, move left if it is an allowed move
        if (isOnMap(player_position_[0]-2,player_position_[1]))
        {
            player_position_[0] -= 2;
        }
        else
        {
            return false;
        }
        break;
    case 'd': // if user inputs d, move right if it is an allowed move
        if (isOnMap(player_position_[0]+2,player_position_[1]))
        {
            player_position_[0] += 2;
        }
        else
        {
            return false;
        }
        break;
    default:
        return false;
    }
    visited(player_position_[0], player_position_[1]);

    // if new location is an Shop location, mark as explored
    // if (isShopLocation(player_position_[0], player_position_[1]))
    // {
    // }
    return true;
}

/*
 * Algorithm: This function prints a 2D map in the terminal.
 * Loop i from 0 to number of ys
 *      Loop j from 0 to number ofyumns
 *          if player position is at (i,j)
 *              print 'X'
 *          else if npc is at (i,j)
 *              if npc has been found:
 *                  print 'N'
 *              else
 *                  print '-'
 *          else
 *              print the value of (i,j) in map_data_
 *
 * Parameters: none
 * Return: nothing (void)
 */
void Map::displayMap()
{
    for (int y = 0;y < height; y++)
    {
        for (int x = 0;x < width;x++)
        {
            if (player_position_[0] == x && player_position_[1] == y)
            {
                cout << PARTY;
            }
            else if (map_data_[x][y] == SHOP)
            { // Shop location, have to check if they were found yet
                for (int k = 0; k < shop_count_; k++)
                {
                    if (shop_locations_[k][0] == x && shop_locations_[k][1] == y)
                    {
                        if (shop_locations_[k][2] == true)
                        {
                            cout << SHOP;
                        }
                        else
                        {
                            cout << UNEXPLORED;
                        }
                    }
                }
            }
            else
            {
                cout << map_data_[x][y];
            }
        }
    }
    cout << endl;
}

/*
 * Algorithm: Mark (row, col) as explored, either revealing NPC or empty space
 * if (row, col) is NPC location
 *      mark npc at player_position_ as found
 * else if (row, col) is a free space
 *      mark space as explored in map data
 *
 * Parameters: row (int), col (int)
 * Return: boolean (bool)
 */
int Map::exploreSpace(int x, int y)
{
    for (int i = 0; i < shop_count_; i++)
    {
        if (x == shop_locations_[i][0] && y == shop_locations_[i][1])
        {
            // mark NPC as found
            shop_locations_[i][2] = 1;
            return 1;
        }
    }
    int chance = rand() % 2;
    if(chance == 1) {
            if(addShop(player_position_[0],player_position_[1],true)) {
                return 1;
            }
    }
    if (isFreeSpace(x, y))
    {
        map_data_[player_position_[0]][player_position_[1]] = EXPLORED;
    }
    return 0;
}


string Map::getShopData(int shop) {
    string data = to_string(shop_locations_[shop][0]) + "," + to_string(shop_locations_[shop][1]) + "," + to_string(shop_locations_[shop][2]);
    return data;
}

string Map::getRaceData(int race) {
    string data = to_string(race_locations_[race][0]) + "," + to_string(race_locations_[race][1]);
    return data;
}

int Map::getMaxShops() {
    return map_max_shops_;
}

char Map::getMapData(int x, int y) {
    char data = map_data_[x][y];
    return data;
}

void Map::inputMapData(int x, int y, char data) {
    map_data_[x][y] = data;
    if(data == 'S') {
        map_max_shops_+=2;
    }
}

bool Map::getMapArea(int x, int y) {
    return map_area_[x][y];
}

void Map::inputMapArea(int x, int y, bool data) {
        map_area_[x][y] = data;
}
#include "Minigame.h"

Minigame::Minigame() {
    readfeatures("terrain.txt");
}

Minigame::Minigame(string name, int level){
    readfeatures("terrain.txt");
    name_ = name;
    level_ = level;
    entry_fee_ = level_ * ((rand() % 10) + 15);
    minutes_ = 2 + (rand() % 4);
    seconds_ = rand() % 60;
    if(level_ == 7) {
        endcap_ = 4;
        length_ = 15 + (rand() % 6);
    }
    else if(level_ >= 5) {
        endcap_ = 3;
        length_ = 7 + (rand() % 4);
    }
    else if (level_ >= 3) {
        endcap_ = 2;
        length_ = 6;
    }
    else {
        endcap_ = 1;
        length_ = 4 + (rand() % 2);
    }
}

string Minigame::getTerrain(int feature) {
    return terrain_[feature];
}

int Minigame::getChoices(int feature) {
    return terrain_choices[feature];
}

string Minigame::getModifiers(int feature, int choice) {
    return modifiers[feature][choice - 1];
}

string Minigame::getTime() {
    string output;
    if(seconds_ < 10) {
         output += to_string(minutes_) + ":0" + to_string(seconds_);
    }
    else {
        output += to_string(minutes_) + ":" + to_string(seconds_);
    }
    return output;
}

string Minigame::getStart() {
    return starts_[endcap_];
}


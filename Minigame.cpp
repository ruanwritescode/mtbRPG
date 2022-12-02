#include "Minigame.h"

Minigame::Minigame() {
    readfeatures("terrain.txt");
}

Minigame::Minigame(string name, int level){
    readfeatures("terrain.txt");
    name_ = name;
    level_ = level;
    entry_fee_ = pow(level_,2) * ((rand() % 10) + 15);
    minutes_ = 2 + (rand() % 4);
    seconds_ = rand() % 60;
    milli_sec = rand() % 1000;
    if(level_ == 7) {
        endcap_ = 3;
        length_ = 15 + (rand() % 6);
    }
    else if(level_ >= 5) {
        endcap_ = 2;
        length_ = 7 + (rand() % 4);
    }
    else if (level_ >= 3) {
        endcap_ = 1;
        length_ = 6;
    }
    else {
        endcap_ = 0;
        length_ = 4 + (rand() % 4);
    }
}

Minigame::Minigame(string name, int level, int entry_fee, int endcap, int length, int min, int sec, int milli) {
    readfeatures("terrain.txt");
    name_ = name;
    level_ = level;
    entry_fee_ = entry_fee;
    minutes_ = min;
    seconds_ = sec;
    milli_sec = milli;
    endcap_ = endcap;
    length_ = length;
}

string Minigame::getAttributes () {
    return name_ + "," + to_string(level_) + "," + to_string(entry_fee_) + "," + to_string(minutes_) + "," + to_string(seconds_) + "," + to_string(milli_sec) + "," + to_string(endcap_) + "," + to_string(length_);
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

int Minigame::getTime() {
    int time = (minutes_ * 100000) + (seconds_ * 1000) + milli_sec;
    return time;
}

string Minigame::timeToText(int minutes, int seconds, int milli_sec) {
    string output = to_string(minutes) + ".";

    for(int i = 0;i < 2 - to_string(seconds).length();i++) {
        output += "0";
    }

    output += to_string(seconds) + ".";

    for(int i = 0;i < 3 - to_string(milli_sec).length();i++) {
        output += "0";
    }

    output += to_string(milli_sec);

    return output;
}

string Minigame::getStart() {
    return starts_[endcap_];
}


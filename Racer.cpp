#include "Racer.h"

Racer::Racer() {
    name_ = "";
    srand(time(NULL));
    strength_   = 65 + rand() % 20;
    skill_      = 65 + rand() % 20;
    endurance_  = 65 + rand() % 20;
    mental_     = 100;
    points_     = 0;
    toolkits_   = 0;
    snacks_     = 0;
    unlocked_consumables = 0;
    unlocked_parts = 0;
    tire_quality_ = 10;
}

string Racer::getName() {
    return name_;
}
int Racer::setName(string name) {
    name_ = name;
    return 1;
}

int Racer::getStrength() {
    return strength_;
}
int Racer::setStrength(int strength) {
    strength_ = strength;
    return 1;
}
int Racer::getSkill() {
    return skill_;
}
int Racer::setSkill(int skill) {
    skill_ = skill;
    return 1;
}
int Racer::getEndurance(){
    return endurance_;
}
int Racer::setEndurance(int endurance) {
    endurance_ = endurance;
    return 1;
}

int Racer::getMental(){
    return mental_;
}
int Racer::setMental(int mental) {
    mental_ = mental;
    return 1;
}

int Racer::getPoints(){return points_;}
int Racer::setPoints(int points) {
    points_ = points;
    return 1;
}
int Racer::addPoints(int earned_points) {
    points_ += earned_points;
    return 1;
}

bool Racer::addPurchase(Items purchased, int category, double money) {
    if(purchased.getPrice() > money) {
        return false;
    }
    if (category == 1 && frame_.getName() == "") {
        frame_ = purchased;
    }
    else if (category == 2 && suspension_.getName() == "") {
        suspension_ = purchased;
    }
    else if (category == 3 && brakes_.getName() == "") {
        brakes_ = purchased;
    }
    else if (category == 4 && wheels_.getName() == "") {
        wheels_ = purchased;
    }
    else {
        return false;
    }
    unlockParts(true);
    return true;
}
void Racer::setPurchase(Items input, int category) {
    if (category == 1) {
        frame_ = input;
    }
    else if (category == 2) {
        suspension_ = input;
    }
    else if (category == 3) {
        brakes_ = input;
    }
    else if (category == 4) {
        wheels_ = input;
    }
}

int Racer::getToolkits(){return toolkits_;}
void Racer::setToolkits(int toolkits) {
    toolkits_ = toolkits;
}
int Racer::addToolkits(int input_toolkits) {
    toolkits_ += input_toolkits;
    return 1;
}

int Racer::getSnacks(){return snacks_;}
void Racer::setSnacks(int snacks){
    snacks_ = snacks;
}
int Racer::addSnacks(int input_snacks) {
    snacks_ += input_snacks;
    return 1;
}

int Racer::getNumTires(){return tires_.size();}
bool Racer::addTires(int input_num_tires, double money, double tires_price){
    if(money < tires_price || tires_.size() + input_num_tires > MAX_TIRES) {
        return false;
    }
    else {
        for(int i = 0; i < input_num_tires;i++) {
            tires_.push_back(10);
        }
    }
    return true;
}

void Racer::setTires(vector<int> saved_tires) {
    tires_ = saved_tires;
}
vector<int> Racer::getTires() {
    return tires_;
}

string Racer::racerStats() {
    string stats;
    stats += name_ + ": Strength: " + to_string(strength_) + " | Skill: " + to_string(skill_) + " | Endurance: " + to_string(endurance_) + " | Mental: " + to_string(mental_) + "\n";
    return stats;
}

Items Racer::getBikePart(int category) {
    Items part;
    if (category == 1) {
        part = frame_;
    }
    else if (category == 2) {
        part = suspension_;
    }
    else if (category == 3) {
        part = brakes_;
    }
    else if (category == 4) {
        part = wheels_;
    }
    return part;
}

bool Racer::areConsumablesUnlocked() {
    return unlocked_consumables;
}
void Racer::unlockConsumables(bool unlock) {
    unlocked_consumables = unlock;
}

bool Racer::arePartsUnlocked() {
    return unlocked_parts;
}
void Racer::unlockParts(bool unlock) {
    unlocked_parts = unlock;
}

void Racer::consumableStats() {
    if(unlocked_consumables) {
        cout << endl;
        cout << "Toolkits: " << toolkits_ << "/" << MAX_TOOLS << endl;
        cout << "Snacks: " << snacks_ << "/" << MAX_SNACKS << endl;
    }
}
void Racer::bikeStats() {
    int width = 26;
    string stats = "";
    if(unlocked_parts){
        stats += "Parts";
        for(int i = 0; i < (width - 3);i++) {
                stats += " ";
        }
        stats += "Health\n";
        if(frame_.getName() != "") {
            stats += frame_.getName() + ": ";
            for(int i = 0; i < (width - frame_.getName().length());i++) {
                stats += " ";
            }
            for(int i = 1;i < frame_.getQuality()/10;i++) {
                    stats += "[]";
            }
            if(frame_.getQuality() % 10 < 5) {
                stats += "[]\n";
            }
            else {
                stats += "[\n";
            }
        }
        else {
            stats += "NO FRAME\n";
        }
        if(suspension_.getName() != "") {
            stats += suspension_.getName() + ": ";
            for(int i = 0; i < (width - suspension_.getName().length());i++) {
                stats += " ";
            }
            for(int i = 1;i < suspension_.getQuality()/5;i++) {
                    stats += "[]";
            }
            if(suspension_.getQuality() % 5 < 2) {
                stats += "[]\n";
            }
            else {
                stats += "[\n";
            }
        }
        else {
            stats += "NO SUSPENSION\n";
        }
        if(brakes_.getName() != "") {
            stats += brakes_.getName() + ": ";
            for(int i = 0; i < (width - brakes_.getName().length());i++) {
                stats += " ";
            }
            for(int i = 1;i < brakes_.getQuality()/5;i++) {
                    stats += "[]";
            }
            if(brakes_.getQuality() % 5 < 2) {
                stats += "[]\n";
            }
            else {
                stats += "[\n";
            }
        }
        else {
            stats += "NO BRAKES\n";
        }
        if(wheels_.getName() != "") {
            stats += wheels_.getName() + ": ";
            for(int i = 0; i < (width - wheels_.getName().length());i++) {
                stats += " ";
            }
            for(int i = 1;i < wheels_.getQuality()/5;i++) {
                    stats += "[]";
            }
            if(wheels_.getQuality() % 5 < 2) {
                stats += "[]\n";
            }
            else {
                stats += "[\n";
            }
        }
        else {
            stats += "NO WHEELS\n";
        }
        if(tires_.size() > 0) {
            string tire_wear = "Current Tires:";
            stats += tire_wear + ": ";
            for(int i = 0; i < (width - tire_wear.length());i++) {
                cout << " ";
            }
            for(int i = 1;i <= tires_.at(0);i++) {
                if(i % 2 == 1) {
                    cout << "[";
                }
                else {
                    cout << "]";
                }
            }
            stats += "\n";

        }
        else {
            stats += "NO TIRES\n";
        }
    }
    cout << stats;
}


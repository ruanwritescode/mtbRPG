#include "Racer.h"
#include <cmath>

Racer::Racer() {
    name_ = "";
    srand(time(NULL));
    strength_   = 65 + rand() % 20;
    skill_      = 65 + rand() % 20;
    endurance_  = 65 + rand() % 20;
    mental_     = 100;
    points_     = 1;
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
void Racer::modStrength(double rate) {
    if(rate > 0) {
        strength_ += rate * (102 -strength_);
    }
    else {
        strength_ += rate * strength_;
    }
}

int Racer::getSkill() {
    return skill_;
}
int Racer::setSkill(int skill) {
    skill_ = skill;
    return 1;
}
void Racer::modSkill(double rate) {
    if(rate > 0) {
        skill_ += rate * (102 -skill_);
    }
    else {
        skill_ += rate/2.0 * skill_;
    }
}

int Racer::getEndurance(){
    return endurance_;
}
int Racer::setEndurance(int endurance) {
    endurance_ = endurance;
    return 1;
}
void Racer::modEndurance(double rate) {
    if(rate > 0) {
        endurance_ += rate * (102 -endurance_);
    }
    else {
        endurance_ += rate * endurance_;
    }
}

int Racer::getMental(){
    return mental_;
}
int Racer::setMental(int mental) {
    mental_ = mental;
    return 1;
}
void Racer::modMental(double rate) {
    if(rate > 0) {
        mental_ += rate * (102 -mental_);
    }
    else {
        mental_ += rate * mental_;
    }
    }

int Racer::getPoints(){return points_;}
int Racer::setPoints(int points) {
    points_ = points;
    return 1;
}
int Racer::addPoints(int earned_points) {
    points_ += earned_points;
    if(points_ < 1){
        points_ = 1;
    }
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
void Racer::removeItem(int category) {
    Items empty_item;
    if (category == 1) {
        frame_ = empty_item;
    }
    else if (category == 2) {
        suspension_ = empty_item;
    }
    else if (category == 3) {
        brakes_ = empty_item;
    }
    else if (category == 4) {
        wheels_ = empty_item;
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
            tires_.push_back(20);
        }
    }
    unlockConsumables(true);
    return true;
}

void Racer::setTires(vector<int> saved_tires) {
    tires_ = saved_tires;
}
vector<int> Racer::getTires() {
    return tires_;
}
bool Racer::modTire() {
    if(tires_.at(0) != 0) {
            tires_.at(0)--;
            return true;
    }
    return false;
}
bool Racer::replaceTire() {
    tires_.erase(tires_.begin());
    return true;
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

bool Racer::repair(int multi) {
    srand(time(NULL));
    if(frame_.getQuality() > 0) {
        frame_.addQuality((rand() % ((frame_.maxQuality() + 5 - frame_.getQuality())/5)) * multi);
    }
    if(suspension_.getQuality() > 0) {
        suspension_.addQuality((rand() % ((suspension_.maxQuality() + 5 - suspension_.getQuality())/5)) * multi);
    }
    if(brakes_.getQuality() > 0) {
        brakes_.addQuality((rand() % ((brakes_.maxQuality() + 5 - brakes_.getQuality())/5)) * multi);
    }
    if(wheels_.getQuality() > 0) {
        wheels_.addQuality((rand() % ((wheels_.maxQuality() + 5 - wheels_.getQuality())/5)) * multi);
    }
    if(frame_.getQuality() <= 0 || suspension_.getQuality() <= 0 || brakes_.getQuality() <= 0 || wheels_.getQuality() <= 0) {
        cout << "You have some parts on your bike that are broken beyond repair. Head to a bike shop to get some new components" << endl;
    }
    if(multi > 0) {
        toolkits_--;
    }
    return true;
}
void Racer::modFrame(double rate) {
        frame_.addQuality(frame_.getQuality() * (rate));
}
void Racer::modSuspension(double rate) {
        suspension_.addQuality(suspension_.getQuality() * (rate));
}
void Racer::modBrakes(double rate) {
        brakes_.addQuality(brakes_.getQuality() * (rate));
}
void Racer::modWheels(double rate) {
        wheels_.addQuality(wheels_.getQuality() * (rate));
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

string Racer::racerStats() {
    string stats;
    stats += name_ + ": Strength " + to_string(strength_) + "  |  Skill " + to_string(skill_) + "  |  Endurance " + to_string(endurance_) + "  |  Mental " + to_string(mental_);
    return stats;
}
string Racer::consumableStats() {
    string output;
    if(unlocked_consumables) {
        output += to_string(snacks_) + "/" + to_string(MAX_SNACKS) + " Snacks   |   " + to_string(toolkits_) + "/" + to_string(MAX_TOOLS) + " Toolkits   |   " + to_string(getNumTires()) + "/" + to_string(MAX_TIRES) + " Tires";
    }
    return output;
}
string Racer::bikeStats() {
    int max_width = 28;
    int width = max_width;
    string stats = "";
    if(unlocked_parts){
        stats += "Parts | Health\n";
        if(frame_.getName() != "") {
            for(int i = 0; i < (width - frame_.getName().length()-2);i++) {
                stats += " ";
            }
            stats += frame_.getName() + " | ";
            for(int i = 1;i <= frame_.getQuality()/10;i++) {
                    stats += "[]";
                    width -= 2;
            }
            if(frame_.getQuality() % 10 > 5) {
                stats += "[]";
                width -= 2;
            }
            else if(frame_.getQuality() % 10 != 0) {
                stats += "[";
                width -= 1;
            }
            for(int j = 0; j < width;j++) {
                stats += " ";
            }
            stats += "\n";
        }
        else {
            stats += "NO FRAME\n";
        }
        width = max_width;
        if(suspension_.getName() != "") {
            for(int i = 0; i < (width - suspension_.getName().length() - 2);i++) {
                stats += " ";
            }
            stats += suspension_.getName() + " | ";
            for(int i = 1;i <= suspension_.getQuality()/10;i++) {
                    stats += "[]";
                    width -= 2;
            }
            if(suspension_.getQuality() % 10 > 5) {
                stats += "[]";
                width -= 2;
            }
            else if(suspension_.getQuality() % 10 != 0){
                stats += "[";
                width -= 1;
            }
            for(int j = 0; j < width;j++) {
                stats += " ";
            }
            stats += "\n";
        }
        else {
            stats += "NO SUSPENSION\n";
        }
        width = max_width;
        if(brakes_.getName() != "") {
            for(int i = 0; i < (width - brakes_.getName().length() - 2);i++) {
                stats += " ";
            }
            stats += brakes_.getName() + " | ";
            for(int i = 1;i <= brakes_.getQuality()/10;i++) {
                    stats += "[]";
                    width -= 2;
            }
            if(brakes_.getQuality() % 10 > 5) {
                stats += "[]";
                width -= 2;
            }
            else if(brakes_.getQuality() % 10 != 0){
                stats += "[";
                width -= 1;
            }
            for(int j = 0; j < width;j++) {
                stats += " ";
            }
            stats += "\n";
        }
        else {
            stats += "NO BRAKES\n";
        }
        width = max_width;
        if(wheels_.getName() != "") {
            for(int i = 0; i < (width - wheels_.getName().length()-2);i++) {
                stats += " ";
            }
            stats += wheels_.getName() + " | ";
            for(int i = 1;i <= wheels_.getQuality()/10;i++) {
                    stats += "[]";
                    width -= 2;
            }
            if(wheels_.getQuality() % 10 > 5) {
                stats += "[]";
                width -= 2;
            }
            else if(brakes_.getQuality() % 10 != 0){
                stats += "[";
                width -= 1;
            }
            for(int j = 0; j < width;j++) {
                stats += " ";
            }
            stats += "\n";
        }
        else {
            stats += "NO WHEELS\n";
        }
        width = max_width;
        if(tires_.size() > 0) {
            string tire_wear = "Current Tire";
            for(int i = 0; i < (width - tire_wear.length() - 2);i++) {
                stats += " ";
            }
            stats += tire_wear + " | ";
            for(int i = 1;i <= (tires_.at(0));i++) {
                if(i % 2 == 1) {
                    stats += "[";
                    width -= 1;
                }
                else {
                    stats += "]";
                    width -= 1;
                }
            }
            for(int j = 0; j < width;j++) {
                stats += " ";
            }
        }
        else {
            stats += "NO TIRES";
        }
    }
    return stats;
}


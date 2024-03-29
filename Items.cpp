#include "Items.h"
#include <iomanip>
#include <iostream>

Items::Items() {
    name_   = "";
    price_  = 0.00;
    quality_ = 0;
    max_quality_ = 100;
}

Items::Items(string input_name,double input_cost,int input_quality,int max_quality) {
    name_ = input_name;
    price_ = input_cost;
    quality_ = input_quality;
    max_quality_ = max_quality;
}

string Items::displayItem(double multiplier) {
    int price = (price_ * multiplier);
    string output = name_ + " $" +  to_string(price) + "\n";
    return output;
}

string Items::getName() {
    return name_;
}
double Items::getPrice() {
    return price_;
}
int Items::getQuality() {
    return quality_;
}
int Items::maxQuality() {
    return max_quality_;
}
bool Items::addQuality(int change) {
    quality_ += change;
    return true;

}
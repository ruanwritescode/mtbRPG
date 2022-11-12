#include "Items.h"
#include <iomanip>
#include <iostream>

Items::Items() {
    name_   = "";
    price_  = 0.00;
    quality = 0;
}

Items::Items(string input_name,double input_cost,int input_quality) {
    name_ = input_name;
    price_ = input_cost;
    quality = input_quality;
}

void Items::displayItem(double multiplier) {
    cout << name_ << " - $" << fixed << setprecision(2) << price_ * multiplier << endl;
}

string Items::getName() {
    return name_;
}
double Items::getPrice() {
    return price_;
}
int Items::getQuality() {
    return quality;
}
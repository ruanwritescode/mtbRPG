#include "Shop.h"
#include <fstream>

Shop::Shop() {
    tool_price  = 100;
    snack_price = 10;
    tire_price = 90;
    multiplier_ = 1;
    readInventory("items.txt");
}
/*
Function to display the available parts in the desired category
Returns an int for the number of items in that category
*/

int Shop::getSnackPrice() {
    return snack_price;
}
int Shop::getToolPrice() {
    return tool_price;
}
int Shop::getTirePrice() {
    return tire_price;
}

int Shop::getMultiplier() {
    return multiplier_;
}
void Shop::changeMultiplier() {
    multiplier_ -= .05;
}

vector<Items> Shop::displayInventory(int category) {
    string title;
    vector<Items> displayed;
    if (category == 1) {
        title = "Frames:";
        displayed = frames_;
    }
    if (category == 2) {
        title = "Suspension:";
        displayed = suspension_;
    }
    if (category == 3) {
        title = "Brakes:";
        displayed = brakes_;
    }
    if (category == 4) {
        title = "Wheels:";
        displayed = wheels_;
    }
    cout << title << endl;
    for(int i = 0;i < displayed.size();i++) {
        cout << i + 1 << ". ";
        displayed.at(i).displayItem(multiplier_);
    }
    cout << endl << "PRESS 0 TO GO BACK" << endl;
    return displayed;
}

void Shop::displayCart(Racer cart, Racer player, int cart_tires) {  
    for(int category = 1; category < 5;category++) {
        int width = 13;
        Items cart_part = cart.getBikePart(category);
        Items player_part = player.getBikePart(category);
        string output = "";
        if(category == 1) {
            output += "Frame: ";
        }
        else if (category == 2) {
            output += "Suspension: ";
        }
        else if (category == 3) {
            output += "Brakes: ";
        }
        else if (category == 4) {
            output += "Wheels: ";
        }
        cout << output;
        for(int i = 0; i < (width - output.length());i++) {
                cout << " ";
        } 
        width = 30;
        if(cart_part.getName() != player_part.getName()) {
            cout << cart_part.getName();
            for(int i = 0; i < (width - cart_part.getName().length());i++) {
                cout << " ";
            } 
            cout << "$" << cart_part.getPrice() * multiplier_;
        }
        else {
            cout << "Empty";
        }
        cout << endl;
    }
    cout << endl << "Tires: " << cart_tires << " $" << fixed << setprecision(0) << cart_tires * tire_price * multiplier_ << endl;
    cout << endl << "Snacks: " << cart.getSnacks() - player.getSnacks() << " $" << fixed << setprecision(0) << (cart.getSnacks() - player.getSnacks()) * snack_price * multiplier_ << endl;
    cout << "Tools: " <<  cart.getToolkits() - player.getToolkits() << " $" << fixed << setprecision(0) << (cart.getToolkits() - player.getToolkits()) * tool_price * multiplier_ << endl;

}
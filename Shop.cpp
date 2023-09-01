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

double Shop::getSnackPrice() {
    return snack_price * multiplier_;
}
double Shop::getToolPrice() {
    return tool_price * multiplier_;
}
double Shop::getTirePrice() {
    return tire_price * multiplier_;
}

int Shop::getMultiplier() {
    return multiplier_;
}
void Shop::changeMultiplier(int level) {
    multiplier_ = 1 + (double(level) * .17);
}

string Shop::cart(Racer cart, Racer player, int cursor) {  
    string output = "";
    int price = 0; //For conversion from double to int for easier readability
    int cart_total = 0;
    int width = 0;
    for(int category = 1; category < 5;category++) {
        string cat_out = "";
        Items cart_part = cart.getBikePart(category);
        Items player_part = player.getBikePart(category);
        if(category == cursor) {
            cat_out += "~ ";
        }
        else {
            cat_out += "  ";
        }
        if(category == 1) {
            cat_out += "Frames: ";
        }
        else if (category == 2) {
            cat_out += "Shocks: ";
        }
        else if (category == 3) {
            cat_out += "Brakes: ";
        }
        else if (category == 4) {
            cat_out += "Wheels: ";
        }
        // for(int w = 0; w < (width - cat_out.length());w++) {
        //         cat_out += " ";
        // } 
        width = 28;
        if(cart_part.getName() != player_part.getName()) {
            cat_out += cart_part.getName();
            price = cart_part.getPrice() * multiplier_;
            cart_total += price;
            for(int i = 0; i < (width - cart_part.getName().length() - to_string(price).length());i++) {
                cat_out += " ";
            }
            cat_out += " $" + to_string(price);
        }
        else {
            cat_out += "Empty";
            for(int i = 0; i < (width - 3);i++) {
                cat_out += " ";
            }
        }
        output += cat_out + "\n";
    }
    output += " ";
    for(int category = 5; category < 8; category ++) {
        int cart_amount;
        if(category == cursor) {
            output += "\n~ ";
        }
        else {
            output += "\n  ";
        }
        if(category == 5) {
            cart_amount = cart.getNumTires() - player.getNumTires();
            price = cart_amount * tire_price * multiplier_;
            cart_total += price;
            output += "Tires:  ";
        }
        if(category == 6) {
            cart_amount = cart.getSnacks() - player.getSnacks();
            price = (cart_amount) * snack_price * multiplier_;
            cart_total += price;
            output += "Snacks: ";
        }
        if(category == 7) {
            cart_amount = cart.getToolkits() - player.getToolkits();
            price = (cart_amount) * tool_price * multiplier_;
            cart_total += price;
            output += "Tools:  ";
        }

        if(cart_amount > 0) {
            output += to_string(cart_amount);
            for(int i = 0; i < (width - 1 - to_string(price).length());i++) {
                output += " ";
            }
            output += " $" + to_string(price);
        }
        else {
            output += "Empty";
            for(int i = 0; i < (width - 3);i++) {
                output += " ";
            }
        }
    }
    if(cursor == 8) {
        output += "\n \n~ Checkout ~";

    }
    else {
        output += "\n \n  Checkout  ";
    }
    for(int i = 0; i < (width - 5 - to_string(cart_total).length());i++) {
        output += " ";
    }
    output += "Total $" + to_string(cart_total);

    return output;

}

vector<Items> Shop::getInventory(int category) {
    vector<Items> displayed;
    if (category == 1) {
        displayed = frames_;
    }
    if (category == 2) {
        displayed = suspension_;
    }
    if (category == 3) {
        displayed = brakes_;
    }
    if (category == 4) {
        displayed = wheels_;
    }
    return displayed;
}

string Shop::displayInventory(int category, int cursor) {
    string output;
    string title;
    vector<Items> displayed = getInventory(category);
    int width = 36;
    if (category == 1) {
        title += "Frames";
    }
    if (category == 2) {
        title += "Suspension";
    }
    if (category == 3) {
        title += "Brakes";
    }
    if (category == 4) {
        title += "Wheels";
    }
    output += title + "\n \n";
    for(int i = 0;i < displayed.size();i++) {
        if(cursor == i+1) {
            output += "~ ";
        }
        else {
            output += "  ";
        }
        output += displayed.at(i).getName();
        int price = displayed.at(i).getPrice() * multiplier_;

        for(int j = 0; j < (width - displayed.at(i).getName().length() - to_string(price).length());j++) {
            output += " ";
        }
        output += " $" + to_string(price) + "\n";
    }
    output += " \n";
    if(cursor == displayed.size() + 1) {
        output += "~ ";
    }
    else {
        output += "  ";
    }
    output += "Clear " + title.substr(0,title.length());
    return output;
}

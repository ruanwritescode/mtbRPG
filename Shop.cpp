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

string Shop::cart(Racer cart, Racer player, int cart_tires) {  
    string output = "";
    int price = 0; //For conversion from double to int for easier readability
    for(int category = 1; category < 5;category++) {
        string cat_out = "";
        int width = 10;
        Items cart_part = cart.getBikePart(category);
        Items player_part = player.getBikePart(category);
        if(category == 1) {
            cat_out += "1. Frames: ";
        }
        else if (category == 2) {
            cat_out += "2. Shocks: ";
        }
        else if (category == 3) {
            cat_out += "3. Brakes: ";
        }
        else if (category == 4) {
            cat_out += "4. Wheels: ";
        }
        // for(int w = 0; w < (width - cat_out.length());w++) {
        //         cat_out += " ";
        // } 
        width = 30;
        if(cart_part.getName() != player_part.getName()) {
            cat_out += cart_part.getName();
            price = cart_part.getPrice() * multiplier_;
            for(int i = 0; i < (width - cart_part.getName().length() - to_string(price).length());i++) {
                cat_out += " ";
            }
            cat_out += " $" + to_string(price);
        }
        else {
            cat_out += "Empty";
            // for(int i = 0; i < (width - 3);i++) {
            //     cat_out += " ";
            // }
        }
        output += cat_out + "\n";
    }
    price = cart_tires * tire_price * multiplier_;
    output += " \n5. Tires:  " + to_string(cart_tires) + " $" + to_string(price) + "\n";
    price = (cart.getSnacks() - player.getSnacks()) * snack_price * multiplier_;
    output += "6. Snacks: " + to_string(cart.getSnacks() - player.getSnacks()) + " $" + to_string(price) + "\n";
    price = (cart.getToolkits() - player.getToolkits()) * tool_price * multiplier_;
    output += "7. Tools:  " +  to_string(cart.getToolkits() - player.getToolkits()) + " $" + to_string(price);
    output += "\n \n0. Checkout";
    return output;

}
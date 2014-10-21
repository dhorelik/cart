var basket = {

    _orderTotal: {
        subtotal: 0,
        vat: 0,
        total: 0
    },

    initialize: function() {

        this
            .findBlocks()
            .setClasses()
            .renderControls()
            .bindEvents()
            .fillOnStart();

    },

    findBlocks: function() {

        this.items = $('.item');
        this.qtys = $('.item__qty');

        this.del = $('.item__delete');
        this.submit = $('.basket__submit');

        this.subtotal = $('.subtotal__value');
        this.vat = $('.vat__value');
        this.total = $('.total__value');

        return this;

    },

    /**
     * Backup for browsers supporting no tricky selectors (the css has :last-child and :nth-child())
     * @param {boolean} isListUpdate
     */
    setClasses: function(isListUpdate) {

        // gets done in IE < 9
        if (!document.addEventListener){

            // if method is called after the list update (ex. one of the items has been removed)
            // odd items have to be revisited
            isListUpdate && $('.item_place_odd').removeClass('item_place_odd');

            this.items.filter(':odd').addClass('item_place_odd');
            $('.basket td:last-child').addClass('item__column_place_last');

        }

        return this;

    },

    /**
     * Input controls (+/-) are added on the fly, since there is no point in having them with js off
     */
    renderControls: function() {

        this.qtys
            .wrap($('<div/>', {
                'class': 'qty'
            }))
            .after($('<a/>', {
                'class': 'qty__minus',
                href: '#',
                text: '-'
            }))
            .after($('<a/>', {
                'class': 'qty__plus',
                href: '#',
                text: '+'
            }));

        return this;

    },

    bindEvents: function() {

        this.qtys.on('keyup', this._onInputUpdate);
        $('.qty').on('click', 'a', this._onPlusMinus);

        this.del.on('click', this._onDelete);

        this.submit.on('click', this._onSubmit);

        return this;

    },

    /**
     * Cost and totals are calculated right away as Firefox keeps form data on reload and qty-s might vary
     */
    fillOnStart: function() {

        var isValid = true;

        this.qtys.each(function() {
            $(this).trigger('keyup');

            // if at least one input is invalid, submit has to be disabled
            if ($(this).hasClass('item__qty_invalid_yes'))
                isValid = false;
        });

        !isValid && this.toggleSubmitStatus(isValid)

    },

    /**
     * Once the qty value has been updated, it gets validated
     * and triggers recalculation of items totals
     */
    _onInputUpdate: function() {

        var updatedInput = $(this),
            newQty = updatedInput.val(),
            isValid = basket.isInputValid(updatedInput, newQty);

        // if the the qty value is invalid, cost is set to 0 and submit is disabled
        if (!isValid)
            newQty = 0;

        basket
            .toggleSubmitStatus(!basket.qtys.hasClass('item__qty_invalid_yes'))
            .calculateItemCost(updatedInput.closest('.item'), newQty)
            .calculateTotal();

    },

    /**
     * Increases/decreases quantity by 1
     */
    _onPlusMinus: function(e) {

        e.preventDefault();

        var target = $(this),
            increment = target.hasClass('qty__plus') ? 1 : -1,
            targetInput = target.siblings('input');

        // has no effect on inputs with invalid values
        if (targetInput.hasClass('item__qty_invalid_yes'))
            return;

        basket.updateQty(targetInput, increment);

    },

    /**
     * Removes the item from the basket and recalculates the totals
     */
    _onDelete: function(e) {

        e.preventDefault();

        $(this).closest('.item').remove();

        // updates the stashed list of items accordingly
        basket.items = $('.item');
        basket.qtys = $('.item__qty');

        basket
            .setClasses(true)
            .toggleSubmitStatus(!basket.qtys.hasClass('item__qty_invalid_yes'))
            .calculateTotal();

    },

    /**
     * Submits basket data
     */
    _onSubmit: function(e) {

        e.preventDefault();

        if(basket.submit.hasClass('basket__submit_disabled_yes'))
            return;

        var data = {
                items: [],
                totals: basket._orderTotal
            };

        basket.items.each(function() {
           data.items.push({
               name: $(this).find('.item__name').text(),
               price: $(this).find('.item__price').text(),
               qty: $(this).find('.item__qty').val(),
               cost: $(this).find('.item__cost').text()
           })
        });

        $.ajax({
            type: 'POST',
            url: '',
            data: JSON.stringify(data),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function() {
                alert('success');
            },
            error: function() {
                alert('error');
            }
        });

    },

    /**
     * Checks if the qty value is valid [1-10] and handles (un-)highlighting the field
     * @param {object} updatedInput
     * @param {string} newQty
     * @returns {boolean}
     */
    isInputValid: function(updatedInput, newQty) {

        var isValid = !!newQty.match(/^([1-9]|10)$/);

        isValid
            ? updatedInput.removeClass('item__qty_invalid_yes')
            : updatedInput.addClass('item__qty_invalid_yes');

        return isValid;

    },

    /**
     * Updates qty value if triggered by +/- buttons
     * @param {object} targetInput
     * @param {number} increment [-1, 1]
     */
    updateQty: function(targetInput, increment) {

        var newQty = +targetInput.val() + increment;

        if (newQty < 1 || newQty > 10)
            return;

        targetInput.val(newQty);

        this
            .calculateItemCost(targetInput.closest('.item'), newQty)
            .calculateTotal();

    },

    /**
     * Recalculates item cost based on its price and qty
     * @param {object} targetItem
     * @param {number} qty
     */
    calculateItemCost: function(targetItem, qty) {

        var price = targetItem.find('.item__price').text(),
            cost = (price * qty).toFixed(2);

        targetItem.find('.item__cost').text(cost);

        return this;

    },

    /**
     * Recalculates subtotal, vat and total
     */
    calculateTotal: function() {

        var subtotal = 0,
            vat = 0,
            total = 0;

        $('.item__cost').each(function() {
            subtotal += +$(this).text();
        });

        subtotal = subtotal.toFixed(2);
        vat = (subtotal * 0.2).toFixed(2);
        total = (subtotal * 1.2).toFixed(2);

        // updating order values to be submitted
        this._orderTotal = {
            subtotal: subtotal,
            vat: vat,
            total: total
        };

        // updating values listed on page
        this.subtotal.text(subtotal);
        this.vat.text(vat);
        this.total.text(total);

        // no point in submitting the form if total is 0
        parseFloat(total) === 0.00 && this.toggleSubmitStatus(false);

    },

    /**
     * Makes the submit button active/inactive
     * @param {boolean} isActive
     */
    toggleSubmitStatus: function(isActive) {

        isActive
            ? this.submit.removeClass('basket__submit_disabled_yes')
            : this.submit.addClass('basket__submit_disabled_yes');

        return this;

    }

};

basket.initialize();

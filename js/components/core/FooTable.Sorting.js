(function ($, FooTable) {

	/**
	 * The sort function for this column. This is set by the plugin. Added by the {@link FooTable.Sorting} component.
	 * @type {function}
	 * @default jQuery.noop
	 */
	FooTable.Column.prototype.sorter = null;
	/**
	 * The direction to sort if the {@link FooTable.Column#sorted} property is set to true. Can be "ASC", "DESC" or NULL. Added by the {@link FooTable.Sorting} component.
	 * @type {string}
	 * @default null
	 */
	FooTable.Column.prototype.direction = null;
	/**
	 * Whether or not the column can be sorted. Added by the {@link FooTable.Sorting} component.
	 * @type {boolean}
	 * @default true
	 */
	FooTable.Column.prototype.sortable = true;
	/**
	 * Whether or not the column is sorted. Added by the {@link FooTable.Sorting} component.
	 * @type {boolean}
	 * @default false
	 */
	FooTable.Column.prototype.sorted = false;

	/**
	 * An object containing the sorting options for the plugin. Added by the {@link FooTable.Sorting} component.
	 * @type {object}
	 * @prop {boolean} enabled=false - Whether or not to allow sorting on the table.
	 * @prop {(string|number|FooTable.Column)} column=null - The column to sort on. Can be an instance of FooTable.Column, the name of a column or the index of a column.
	 * @prop {string} direction=null - The direction to sort the column by. Can be "ASC", "DESC" or NULL.
	 */
	FooTable.Defaults.prototype.sorting = {
		enabled: false,
		column: null,
		direction: null
	};

	/**
	 * These sorters are supplied two values from the column and a comparison must be made between them and the result returned.
	 * The name of the sorter must match a {@link FooTable.Column#type} for it to be used automatically by the plugin for those columns.
	 * Added by the {@link FooTable.Sorting} component.
	 * @summary An object containing the default sorters for the plugin to use.
	 * @type {object.<string, function(HTMLTableCellElement)>}
	 * @default { "text": function, "number": function }
	 * @example <caption>This example shows using pseudo code what a sorter would look like.</caption>
	 * sorters: {
	 *  ...
	 * 	"pseudo": function(a, b){
	 * 		if (a is less than b by some ordering criterion) {
	 * 			return -1;
	 * 		}
	 * 		if (a is greater than b by the ordering criterion) {
	 * 			return 1;
	 * 		}
	 * 		// a must be equal to b
	 * 		return 0;
	 * 	}
	 * }
	 * @example <caption>This example shows how to register a sorter for the custom column type of "example" which is a number.</caption>
	 * sorters: {
	 * 	...
	 * 	"example": function(a, b){
	 * 		return a - b;
	 * 	}
	 * }
	 */
	FooTable.Defaults.prototype.sorters = {
		text: function (a, b) {
			if (typeof(a) === 'string') { a = a.toLowerCase(); }
			if (typeof(b) === 'string') { b = b.toLowerCase(); }
			if (a === b) return 0;
			if (a < b) return -1;
			return 1;
		},
		number: function (a, b) {
			return a - b;
		}
	};

	/**
	 * The name of the column to sort on. Added by the {@link FooTable.Sorting} component.
	 * @type {string}
	 * @default NULL
	 */
	FooTable.RequestData.prototype.sortColumn = null;

	/**
	 * The direction to sort the column by. Can be "ASC", "DESC" or NULL. Added by the {@link FooTable.Sorting} component.
	 * @type {string}
	 * @default NULL
	 */
	FooTable.RequestData.prototype.sortDirection = null;

	FooTable.Sorting = FooTable.Component.extend(/** @lends FooTable.Sorting */{
		/**
		 * The sorting component adds a small sort button to specified column headers allowing users to sort those columns in the table.
		 * @constructs
		 * @extends FooTable.Component
		 * @param {FooTable.Instance} instance - The parent {@link FooTable.Instance} object for the component.
		 * @returns {FooTable.Sorting}
		 */
		ctor: function (instance) {

			/* PROTECTED */
			/**
			 * This provides a shortcut to the {@link FooTable.Instance#options}.[sorting]{@link FooTable.Defaults#sorting} object.
			 * @protected
			 * @type {object}
			 */
			this.o = instance.options.sorting;

			/* PRIVATE */
			/**
			 * Sets a flag indicating whether or not the sorting has changed. When set to true the {@link FooTable.Sorting#sorting_changing} and {@link FooTable.Sorting#sorting_changed} events
			 * will be raised during the drawing operation.
			 * @private
			 * @type {boolean}
			 */
			this._changed = false;

			// call the constructor of the base class
			this._super(instance);
		},

		/* PROTECTED */
		/**
		 * Allows the filtering component to extend the {@link FooTable.Column} constructor.
		 * @instance
		 * @protected
		 * @param {FooTable.Column} column - The column being constructed.
		 * @param {object} definition - The definition to populate the column with.
		 */
		ctor_column: function(column, definition){
			column.sorter = FooTable.checkFnPropValue(definition.sorter, this.ft.options.sorters[definition.type] || this.ft.options.sorters.text);
			column.direction = FooTable.is.type(definition.direction, 'string') ? definition.direction : null;
			column.sortable = FooTable.is.boolean(definition.sortable) ? definition.sortable : true;
			column.sorted = FooTable.is.boolean(definition.sorted) ? definition.sorted : false;
			if (this.o.enabled == true && column.sortable) column.$el.addClass('footable-sortable');
		},
		/**
		 * Initializes the sorting component for the plugin using the supplied table and options.
		 * @instance
		 * @protected
		 * @param {HTMLTableElement} table - The table element the plugin was initialized on.
		 * @param {object} options - The options the plugin was initialized with.
		 * @fires FooTable.Sorting#sorting_init
		 */
		init: function (table, options) {
			if (this.o.enabled == false) return;
			this._generate(options);
			/**
			 * The sorting_init event is raised after its UI is generated.
			 * @event FooTable.Sorting#sorting_init
			 * @param {jQuery.Event} e - The jQuery.Event object for the event.
			 * @param {FooTable.Instance} instance - The instance of the plugin raising the event.
			 */
			this.ft.raise('sorting_init');
		},
		/**
		 * Reinitializes the sorting component for the plugin using the supplied table and options.
		 * @instance
		 * @protected
		 * @param {HTMLTableElement} table - The table element the plugin was initialized on.
		 * @param {object} options - The options the plugin was initialized with.
		 * @fires FooTable.Sorting#sorting_reinit
		 */
		reinit: function (table, options) {
			this.destroy();
			if (this.o.enabled == false) return;
			this._generate(options);
			/**
			 * The sorting_reinit event is raised after its UI is regenerated.
			 * @event FooTable.Sorting#sorting_reinit
			 * @param {jQuery.Event} e - The jQuery.Event object for the event.
			 * @param {FooTable.Instance} instance - The instance of the plugin raising the event.
			 */
			this.ft.raise('sorting_reinit');
		},
		/**
		 * Destroys the sorting component removing any UI generated from the table.
		 * @instance
		 * @protected
		 */
		destroy: function () {
			if (this.o.enabled == false) return;
			this.ft.$table.off('click.footable', '.footable-sortable', this._onSortClicked);
			this.ft.$table.children('thead').children('tr.footable-header')
				.children('.footable-sortable').removeClass('footable-sortable')
				.find('span.direction').remove();
		},
		/**
		 * Appends or updates any sorting specific properties on the {@link FooTable.RequestData} object.
		 * @instance
		 * @protected
		 * @param {FooTable.RequestData} data - The {@link FooTable.RequestData} object about to passed to the {@link FooTable.Defaults#ajax} method.
		 */
		preajax: function (data) {
			if (this.o.enabled == false) return;
			data.sortColumn = this.o.column.name;
			data.sortDirection = this.o.direction;
		},
		/**
		 * Performs the actual sorting against the {@link FooTable.Rows#array}.
		 * @instance
		 * @protected
		 */
		predraw: function () {
			if (this.o.enabled == false
				|| this.ft.options.ajaxEnabled == true
				|| !this.o.column
				|| !this.o.direction)
				return;

			var self = this;
			self.ft.rows.array.sort(function (a, b) {
				return self.o.direction == 'ASC'
					? self.o.column.sorter(a.cells[self.o.column.index].value, b.cells[self.o.column.index].value, self.ft.options)
					: self.o.column.sorter(b.cells[self.o.column.index].value, a.cells[self.o.column.index].value, self.ft.options);
			});
		},
		/**
		 * Updates the sorting UI setting the state of the sort buttons.
		 * @instance
		 * @protected
		 */
		draw: function () {
			if (this.o.enabled == false || !this.o.column || !this.o.direction) return;
			var self = this,
				$sortable = self.ft.$table.children('thead').children('tr.footable-header').children('.footable-sortable'),
				$active = self.o.column.$el;

			$sortable.removeClass('footable-asc footable-desc').children('.fooicon').removeClass('fooicon-sort fooicon-sort-asc fooicon-sort-desc');
			$sortable.not($active).children('.fooicon').addClass('fooicon-sort');
			$active.addClass(self.o.direction == 'ASC' ? 'footable-asc' : 'footable-desc')
				.children('.fooicon').addClass(self.o.direction == 'ASC' ? 'fooicon-sort-asc' : 'fooicon-sort-desc');
		},

		/* PUBLIC */
		/**
		 * Sets the sorting options and calls the {@link FooTable.Instance#update} method to perform the actual sorting.
		 * @instance
		 * @param {(string|number|FooTable.Column)} column - The column name, index or the actual {@link FooTable.Column} object to sort by.
		 * @param {string} [direction="ASC"] - The direction to sort by, either ASC or DESC.
		 * @returns {jQuery.Promise}
		 * @fires FooTable.Sorting#"change.ft.sorting"
		 * @fires FooTable.Sorting#"changed.ft.sorting"
		 */
		sort: function(column, direction){
			return this._sort(column, direction, true);
		},

		/* PRIVATE */
		/**
		 * Generates the sorting UI from the supplied options.
		 * @instance
		 * @private
		 * @param {object} options - The options to use to generate UI.
		 */
		_generate: function (options) {
			var self = this;
			options.sorting.column = self.ft.columns.get(options.sorting.column) || self.ft.columns.first(function (col) { return col.sorted; });
			options.sorting.direction = options.sorting.column == null
				? null
				: (options.sorting.direction == null
					? (options.sorting.column.direction == null
						? 'ASC'
						: options.sorting.column.direction)
					: options.sorting.direction);

			$.each(self.ft.columns.array, function(i, col){
				if (col == options.sorting.column) col.direction = options.sorting.direction;
				else col.direction = null;
			});
			self.ft.$table.addClass('footable-sorting').children('thead').children('tr.footable-header').children('th,td').filter(function (i) {
				return self.ft.columns.array[i].sortable == true;
			}).append($('<span/>', {'class': 'fooicon fooicon-sort'}));
			self.ft.$table.on('click.footable', '.footable-sortable', { self: self }, self._onSortClicked);
		},

		/**
		 * Performs the required steps to handle sorting including the raising of the {@link FooTable.Sorting#"change.ft.sorting"} and {@link FooTable.Sorting#"changed.ft.sorting"} events.
		 * @instance
		 * @private
		 * @param {(string|number|FooTable.Column)} column - The column name, index or the actual {@link FooTable.Column} object to sort by.
		 * @param {string} [direction="ASC"] - The direction to sort by, either ASC or DESC.
		 * @param {boolean} redraw - Whether or not this operation requires a redraw of the table.
		 * @returns {jQuery.Promise}
		 * @fires FooTable.Sorting#"change.ft.sorting"
		 * @fires FooTable.Sorting#"changed.ft.sorting"
		 */
		_sort: function(column, direction, redraw){
			var self = this;
			var sorter = new FooTable.Sorter(self.ft.columns.get(column), self._direction(direction));
			/**
			 * The change.ft.sorting event is raised before a sort is applied and allows listeners to modify the sorter or cancel it completely by calling preventDefault on the jQuery.Event object.
			 * @event FooTable.Sorting#"change.ft.sorting"
			 * @param {jQuery.Event} e - The jQuery.Event object for the event.
			 * @param {FooTable.Instance} instance - The instance of the plugin raising the event.
			 * @param {FooTable.Sorter} sorter - The sorter that is about to be applied.
			 */
			if (self.ft.raise('change.ft.sorting', [sorter]).isDefaultPrevented()) return $.when();
			self.o.column = self.ft.columns.get(sorter.column);
			self.o.direction = self._direction(sorter.direction);
			return (redraw ? self.ft.update() : $.when()).then(function(){
				$.each(self.ft.columns.array, function(i, col){
					if (col == self.o.column) col.direction = self.o.direction;
					else col.direction = null;
				});
				/**
				 * The changed.ft.sorting event is raised after a sorter has been applied.
				 * @event FooTable.Sorting#"changed.ft.sorting"
				 * @param {jQuery.Event} e - The jQuery.Event object for the event.
				 * @param {FooTable.Instance} instance - The instance of the plugin raising the event.
				 * @param {FooTable.Sorter} sorter - The sorter that has been applied.
				 */
				self.ft.raise('changed.ft.sorting', [sorter]);
			});
		},
		/**
		 * Checks the supplied string is a valid direction and if not assigns it to ASC.
		 * @param {string} str - The string to check.
		 * @private
		 */
		_direction: function(str){
			return FooTable.is.type(str, 'string') && (str == 'ASC' || str == 'DESC') ? str : 'ASC';
		},
		/**
		 * Handles the sort button clicked event.
		 * @instance
		 * @private
		 * @param {jQuery.Event} e - The event object for the event.
		 */
		_onSortClicked: function (e) {
			e.preventDefault();
			var self = e.data.self, $header = $(this).closest('th,td'),
				direction = $header.is('.footable-asc, .footable-desc')
					? ($header.hasClass('footable-desc') ? 'ASC' : 'DESC')
					: 'ASC';
			self._sort($header.index(), direction, true);
		}
	});

	// Below are methods exposed on the core FooTable.Instance object for easy access

	/**
	 * Sort the table using the specified column and direction. Added by the {@link FooTable.Sorting} component.
	 * @instance
	 * @param {(string|number|FooTable.Column)} column - The column name, index or the actual {@link FooTable.Column} object to sort by.
	 * @param {string} [direction="ASC"] - The direction to sort by, either ASC or DESC.
	 * @returns {jQuery.Promise}
	 * @fires FooTable.Sorting#"change.ft.sorting"
	 * @fires FooTable.Sorting#"changed.ft.sorting"
	 * @see FooTable.Sorting#sort
	 */
	FooTable.Instance.prototype.sort = function(column, direction){
		return this.use(FooTable.Sorting).sort(column, direction);
	};

})(jQuery, FooTable = window.FooTable || {});
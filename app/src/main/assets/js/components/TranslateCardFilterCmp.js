"use strict";

const AVAILABLE_TRANSLATE_CARD_FILTERS = {
    SEARCH_IN_ACTIVE:'SEARCH_IN_ACTIVE',
    INCLUDE_TAGS:'INCLUDE_TAGS',
    EXCLUDE_TAGS:'EXCLUDE_TAGS',
    CREATED_ON_OR_AFTER:'CREATED_ON_OR_AFTER',
    CREATED_ON_OR_BEFORE:'CREATED_ON_OR_BEFORE',
    NATIVE_TEXT_LENGTH:'NATIVE_TEXT_LENGTH',
    NATIVE_TEXT_CONTAINS:'NATIVE_TEXT_CONTAINS',
    FOREIGN_TEXT_LENGTH:'FOREIGN_TEXT_LENGTH',
    FOREIGN_TEXT_CONTAINS:'FOREIGN_TEXT_CONTAINS',
    BECOMES_ACCESSIBLE_ON_OR_AFTER:'BECOMES_ACCESSIBLE_ON_OR_AFTER',
    BECOMES_ACCESSIBLE_ON_OR_BEFORE:'BECOMES_ACCESSIBLE_ON_OR_BEFORE',
    SORT_BY:'SORT_BY',
}

const CARD_FILTER_SORT_ORDER = {
    SEARCH_IN_ACTIVE:1,
    INCLUDE_TAGS:2,
    EXCLUDE_TAGS:3,
    CREATED_ON_OR_AFTER:4,
    CREATED_ON_OR_BEFORE:5,
    NATIVE_TEXT_LENGTH:6,
    NATIVE_TEXT_CONTAINS:7,
    FOREIGN_TEXT_LENGTH:8,
    FOREIGN_TEXT_CONTAINS:9,
    BECOMES_ACCESSIBLE_ON_OR_AFTER:10,
    BECOMES_ACCESSIBLE_ON_OR_BEFORE:11,
    SORT_BY:12,
}

const AVAILABLE_TRANSLATE_CARD_SORT_BY = {
    TIME_CREATED:'TIME_CREATED',
    NEXT_ACCESS_AT:'NEXT_ACCESS_AT',
}

const AVAILABLE_TRANSLATE_CARD_SORT_DIR = {
    ASC:'ASC',
    DESC:'DESC',
}

const TranslateCardFilterCmp = ({
                                    allTags, allTagsMap, initialState, stateRef, onSubmit, minimized,
                                    submitButtonIconName = 'search',
                                    allowedFilters, defaultFilters = [AVAILABLE_TRANSLATE_CARD_FILTERS.INCLUDE_TAGS, AVAILABLE_TRANSLATE_CARD_FILTERS.EXCLUDE_TAGS],
                                    cardUpdateCounter
                                }) => {
    const {renderMessagePopup, showError, showDialog} = useMessagePopup()
    const af = AVAILABLE_TRANSLATE_CARD_FILTERS
    const sb = AVAILABLE_TRANSLATE_CARD_SORT_BY
    const sd = AVAILABLE_TRANSLATE_CARD_SORT_DIR

    const [cardToTagsMap, setCardToTagsMap] = useState(null)
    const [errorLoadingCardToTagsMap, setErrorLoadingCardToTagsMap] = useState(null)

    const [filtersSelected, setFiltersSelected] = useState(initialState?.filtersSelected??defaultFilters)
    const [focusedFilter, setFocusedFilter] = useState(initialState?.focusedFilter??filtersSelected[0])

    const [searchInActive, setSearchInActive] = useState(initialState?.searchInActive??true)

    const [tagsToInclude, setTagsToInclude] = useState(initialState?.tagsToInclude??[])
    const [tagsToExclude, setTagsToExclude] = useState(initialState?.tagsToExclude??[])
    const [remainingTags, setRemainingTags] = useState([])

    const [createdOnOrAfter, setCreatedOnOrAfter] = useState(() => initialState?.createdOnOrAfter ? new Date(initialState?.createdOnOrAfter) : new Date())
    const [createdOnOrBefore, setCreatedOnOrBefore] = useState(() => initialState?.createdOnOrBefore ? new Date(initialState?.createdOnOrBefore) : new Date())

    const [becomesAccessibleOnOrAfter, setBecomesAccessibleOnOrAfter] = useState(
        () => initialState?.becomesAccessibleOnOrAfter ? new Date(initialState?.becomesAccessibleOnOrAfter) : new Date()
    )
    const [becomesAccessibleOnOrBefore, setBecomesAccessibleOnOrBefore] = useState(
        () => initialState?.becomesAccessibleOnOrBefore ? new Date(initialState?.becomesAccessibleOnOrBefore) : new Date()
    )

    const [nativeTextMinLength, setNativeTextMinLength] = useState(initialState?.nativeTextMinLength??null)
    const [nativeTextMaxLength, setNativeTextMaxLength] = useState(initialState?.nativeTextMaxLength??null)
    const [nativeTextContains, setNativeTextContains] = useState(initialState?.nativeTextContains??'')
    const [foreignTextMinLength, setForeignTextMinLength] = useState(initialState?.foreignTextMinLength??null)
    const [foreignTextMaxLength, setForeignTextMaxLength] = useState(initialState?.foreignTextMaxLength??null)
    const [foreignTextContains, setForeignTextContains] = useState(initialState?.foreignTextContains??'')

    const [sortBy, setSortBy] = useState(initialState?.sortBy??sb.TIME_CREATED)
    const [sortDir, setSortDir] = useState(initialState?.sortDir??sd.ASC)

    if (stateRef) {
        stateRef.current = {}
        stateRef.current.filtersSelected = filtersSelected
        stateRef.current.focusedFilter = focusedFilter
        stateRef.current.searchInActive = searchInActive
        stateRef.current.tagsToInclude = tagsToInclude
        stateRef.current.tagsToExclude = tagsToExclude
        stateRef.current.createdOnOrAfter = createdOnOrAfter.getTime()
        stateRef.current.createdOnOrBefore = createdOnOrBefore.getTime()
        stateRef.current.nativeTextMinLength = nativeTextMinLength
        stateRef.current.nativeTextMaxLength = nativeTextMaxLength
        stateRef.current.nativeTextContains = nativeTextContains
        stateRef.current.foreignTextMinLength = foreignTextMinLength
        stateRef.current.foreignTextMaxLength = foreignTextMaxLength
        stateRef.current.foreignTextContains = foreignTextContains
        stateRef.current.sortBy = sortBy
        stateRef.current.sortDir = sortDir
    }

    useEffect(() => {
        if (initialState) {
            doSubmit()
        }
    }, [])

    useEffect(async () => {
        const res = await be.getCardToTagMapping()
        if (res.err) {
            setErrorLoadingCardToTagsMap(res.err)
            showError(res.err)
        } else {
            setCardToTagsMap(res.data)
        }
    }, [cardUpdateCounter])

    useEffect(async () => {
        if (cardToTagsMap) {
            recalculateRemainingTags()
        }
    }, [cardToTagsMap, tagsToInclude, tagsToExclude])

    function recalculateRemainingTags() {
        const remainingTagIds = []
        for (const cardId in cardToTagsMap) {
            const cardTagIds = cardToTagsMap[cardId]
            let cardPassed = true
            for (const tag of tagsToInclude) {
                if (!cardTagIds.includes(tag.id)) {
                    cardPassed = false
                    break
                }
            }
            if (cardPassed) {
                for (const tag of tagsToExclude) {
                    if (cardTagIds.includes(tag.id)) {
                        cardPassed = false
                        break
                    }
                }
                if (cardPassed) {
                    remainingTagIds.push(...cardTagIds)
                }
            }
        }
        const tagIdsToInclude = tagsToInclude.map(t=>t.id)
        const tagIdsToExclude = tagsToExclude.map(t=>t.id)
        const remainingTags = remainingTagIds
            .distinct()
            .filter(tagId => !tagIdsToInclude.includes(tagId) && !tagIdsToExclude.includes(tagId))
            .map(tagId => allTagsMap[tagId])
        setRemainingTags(remainingTags)
    }

    function addFilter(name) {
        setFiltersSelected(prev => [name, ...prev])
        setFocusedFilter(name)
    }

    function removeFilter(name) {
        setFiltersSelected(prev => prev.filter(n => n !== name))
    }

    function createSearchInActiveFilterObject() {
        const filterName = af.SEARCH_IN_ACTIVE
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: 'Active or Paused',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setSearchInActive(true)
                            }}
                        ),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Active or paused:')
                    ),
                    RE.If(minimized, () => RE.span({style:{padding:'5px', color:'blue'}}, searchInActive ? 'Active' : 'Paused')),
                    RE.IfNot(minimized, () => RE.FormControl({component:'fieldset', style:{marginLeft:'10px'}},
                        RE.RadioGroup({row:true, value: searchInActive, onChange: event => setSearchInActive(event.target.value === 'true')},
                            RE.FormControlLabel({value:true, control:RE.Radio({}), label: 'Active'}),
                            RE.FormControlLabel({value:false, control:RE.Radio({}), label: 'Paused', style:{marginLeft:'10px'}}),
                        )
                    ))
                ),
                renderMinimized: () => `Search in: ${searchInActive ? 'Active' : 'Paused'}`,
                getFilterValues: () => ({paused: !searchInActive})
            }
        }
    }

    function createTagsToIncludeFilterObject() {
        const filterName = af.INCLUDE_TAGS
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: 'Tags to include',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setTagsToInclude([])
                            }}
                        ),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Include:')
                    ),
                    re(TagSelector,{
                        allTags: remainingTags,
                        selectedTags: tagsToInclude,
                        onTagRemoved:tag=>{
                            setTagsToInclude(prev=>prev.filter(t=>t.id!=tag.id))
                        },
                        onTagSelected:tag=>{
                            setTagsToInclude(prev=>[...prev,tag])
                        },
                        label: 'Include',
                        color:'primary',
                        minimized,
                        autoFocus: true,
                    })
                ),
                renderMinimized: () => RE.Fragment({},
                    'Include: ',
                    renderListOfTags({tags: tagsToInclude, color:'blue'})
                ),
                getFilterValues: () => ({tagIdsToInclude: tagsToInclude.map(t=>t.id)})
            }
        }
    }

    function createTagsToExcludeFilterObject() {
        const filterName = af.EXCLUDE_TAGS
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: 'Tags to exclude',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setTagsToExclude([])
                            }
                        }),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Exclude:')
                    ),
                    re(TagSelector,{
                        allTags: remainingTags,
                        selectedTags: tagsToExclude,
                        onTagRemoved:tag=>{
                            setTagsToExclude(prev=>prev.filter(t=>t.id!=tag.id))
                        },
                        onTagSelected:tag=>{
                            setTagsToExclude(prev=>[...prev,tag])
                        },
                        label: 'Exclude',
                        color:'secondary',
                        minimized,
                        autoFocus: true,
                    })
                ),
                renderMinimized: () => RE.Fragment({},
                    'Exclude: ',
                    renderListOfTags({tags: tagsToExclude, color:'red'})
                ),
                getFilterValues: () => ({tagIdsToExclude: tagsToExclude.map(t=>t.id)})
            }
        }
    }

    function createCreatedOnOrAfterFilterObject() {
        const filterName = af.CREATED_ON_OR_AFTER
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: 'Created on or after',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setCreatedOnOrAfter(new Date())
                            }
                        }),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Created on or after:')
                    ),
                    re(DateSelector,{
                        selectedDate: createdOnOrAfter,
                        onDateSelected: newDate => setCreatedOnOrAfter(newDate),
                        minimized,
                    })
                ),
                renderMinimized: () => `Created on or after: ${createdOnOrAfter.getFullYear()} ${ALL_MONTHS[createdOnOrAfter.getMonth()]} ${createdOnOrAfter.getDate()}`,
                getFilterValues: () => ({createdFrom: startOfDay(createdOnOrAfter).getTime()})
            }
        }
    }

    function createCreatedOnOrBeforeFilterObject() {
        const filterName = af.CREATED_ON_OR_BEFORE
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: 'Created on or before',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setCreatedOnOrBefore(new Date())
                            }
                        }),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Created on or before:')
                    ),
                    re(DateSelector,{
                        selectedDate: createdOnOrBefore,
                        onDateSelected: newDate => setCreatedOnOrBefore(newDate),
                        minimized,
                    })
                ),
                renderMinimized: () => `Created on or before: ${createdOnOrBefore.getFullYear()} ${ALL_MONTHS[createdOnOrBefore.getMonth()]} ${createdOnOrBefore.getDate()}`,
                getFilterValues: () => ({createdTill: addDays(startOfDay(createdOnOrBefore),1).getTime()})
            }
        }
    }

    function createBecomesAccessibleOnOrAfterFilterObject() {
        const filterName = af.BECOMES_ACCESSIBLE_ON_OR_AFTER
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: 'Accessible on or after',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setBecomesAccessibleOnOrAfter(new Date())
                            }
                        }),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Accessible on or after:')
                    ),
                    re(DateSelector,{
                        selectedDate: becomesAccessibleOnOrAfter,
                        onDateSelected: newDate => setBecomesAccessibleOnOrAfter(newDate),
                        minimized,
                    })
                ),
                renderMinimized: () =>
                    'Accessible on or after: '+
                        `${becomesAccessibleOnOrAfter.getFullYear()} ${ALL_MONTHS[becomesAccessibleOnOrAfter.getMonth()]} ${becomesAccessibleOnOrAfter.getDate()}`,
                getFilterValues: () => ({nextAccessFrom: startOfDay(becomesAccessibleOnOrAfter).getTime()})
            }
        }
    }

    function createBecomesAccessibleOnOrBeforeFilterObject() {
        const filterName = af.BECOMES_ACCESSIBLE_ON_OR_BEFORE
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: 'Accessible on or before',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setBecomesAccessibleOnOrBefore(new Date())
                            }
                        }),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Accessible on or before:')
                    ),
                    re(DateSelector,{
                        selectedDate: becomesAccessibleOnOrBefore,
                        onDateSelected: newDate => setBecomesAccessibleOnOrBefore(newDate),
                        minimized,
                    })
                ),
                renderMinimized: () =>
                    'Accessible on or before: '+
                        `${becomesAccessibleOnOrBefore.getFullYear()} ${ALL_MONTHS[becomesAccessibleOnOrBefore.getMonth()]} ${becomesAccessibleOnOrBefore.getDate()}`,
                getFilterValues: () => ({nextAccessTill: addDays(startOfDay(becomesAccessibleOnOrBefore),1).getTime()})
            }
        }
    }

    function createNativeTextLengthFilterObject() {
        const filterName = af.NATIVE_TEXT_LENGTH
        const minimized = filterName !== focusedFilter
        const parameterName = '(native text length)'
        return {
            [filterName]: {
                displayName: 'Native text length',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setNativeTextMinLength(null)
                                setNativeTextMaxLength(null)
                            }
                        }),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Native text length:')
                    ),
                    re(IntRangeSelector,{
                        selectedMin: nativeTextMinLength,
                        selectedMax: nativeTextMaxLength,
                        onMinSelected: newValue => setNativeTextMinLength(newValue),
                        onMaxSelected: newValue => setNativeTextMaxLength(newValue),
                        parameterName: parameterName,
                        minimized,
                    })
                ),
                renderMinimized: () => `${(hasValue(nativeTextMinLength) ? nativeTextMinLength : 0) + ' \u2264 '}${parameterName}${hasValue(nativeTextMaxLength) ? ' \u2264 ' + nativeTextMaxLength : ''}`,
                getFilterValues: () => ({
                    textToTranslateLengthGreaterThan: hasValue(nativeTextMinLength) ? nativeTextMinLength - 1 : null,
                    textToTranslateLengthLessThan: hasValue(nativeTextMaxLength) ? (nativeTextMaxLength-0) + 1 : null,
                })
            }
        }
    }

    function createNativeTextContainsFilterObject() {
        const filterName = af.NATIVE_TEXT_CONTAINS
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: 'Native text contains',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setNativeTextContains('')
                            }
                        }),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Native text contains:')
                    ),
                    RE.If(minimized, () => RE.span({style:{padding:'5px', color:'blue'}}, `"${nativeTextContains}"`)),
                    RE.IfNot(minimized, () => textField({
                        value: nativeTextContains,
                        label: 'Native text contains',
                        variant: 'outlined',
                        autoFocus:true,
                        multiline: false,
                        maxRows: 1,
                        size: 'small',
                        inputProps: {size:24},
                        style: {margin:'5px'},
                        onChange: event => {
                            const newText = event.nativeEvent.target.value
                            if (newText != nativeTextContains) {
                                setNativeTextContains(newText)
                            }
                        },
                    }))
                ),
                renderMinimized: () => `Native text contains: "${nativeTextContains}"`,
                getFilterValues: () => ({textToTranslateContains: nativeTextContains})
            }
        }
    }

    function createForeignTextLengthFilterObject() {
        const filterName = af.FOREIGN_TEXT_LENGTH
        const minimized = filterName !== focusedFilter
        const parameterName = '(foreign text length)'
        return {
            [filterName]: {
                displayName: 'Foreign text length',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setForeignTextMinLength(null)
                                setForeignTextMaxLength(null)
                            }
                        }),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Foreign text length:')
                    ),
                    re(IntRangeSelector,{
                        selectedMin: foreignTextMinLength,
                        selectedMax: foreignTextMaxLength,
                        onMinSelected: newValue => setForeignTextMinLength(newValue),
                        onMaxSelected: newValue => setForeignTextMaxLength(newValue),
                        parameterName: parameterName,
                        minimized,
                    })
                ),
                renderMinimized: () => `${(hasValue(foreignTextMinLength) ? foreignTextMinLength : 0) + ' \u2264 '}${parameterName}${hasValue(foreignTextMaxLength) ? ' \u2264 ' + foreignTextMaxLength : ''}`,
                getFilterValues: () => ({
                    translationLengthGreaterThan: hasValue(foreignTextMinLength) ? foreignTextMinLength - 1 : null,
                    translationLengthLessThan: hasValue(foreignTextMaxLength) ? (foreignTextMaxLength-0) + 1 : null,
                })
            }
        }
    }

    function createForeignTextContainsFilterObject() {
        const filterName = af.FOREIGN_TEXT_CONTAINS
        const minimized = filterName !== focusedFilter
        return {
            [filterName]: {
                displayName: 'Foreign text contains',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setForeignTextContains('')
                            }
                        }),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Foreign text contains:')
                    ),
                    RE.If(minimized, () => RE.span({style:{padding:'5px', color:'blue'}}, `"${foreignTextContains}"`)),
                    RE.IfNot(minimized, () => textField({
                        value: foreignTextContains,
                        label: 'Foreign text contains',
                        variant: 'outlined',
                        autoFocus:true,
                        multiline: false,
                        maxRows: 1,
                        size: 'small',
                        inputProps: {size:24},
                        style: {margin:'5px'},
                        onChange: event => {
                            const newText = event.nativeEvent.target.value
                            if (newText != foreignTextContains) {
                                setForeignTextContains(newText)
                            }
                        },
                    }))
                ),
                renderMinimized: () => `Foreign text contains: "${foreignTextContains}"`,
                getFilterValues: () => ({translationContains: foreignTextContains})
            }
        }
    }

    function createSortByFilterObject() {
        const filterName = af.SORT_BY
        const minimized = filterName !== focusedFilter
        const possibleParams = {
            [sb.TIME_CREATED]:{displayName:'Date created'},
            [sb.NEXT_ACCESS_AT]:{displayName:'Next access at'},
        }
        const possibleDirs = {[sd.ASC]:{displayName:'A-Z'}, [sd.DESC]:{displayName:'Z-A'}}
        return {
            [filterName]: {
                displayName: 'Sort by',
                render: () => RE.Container.col.top.left({},{},
                    RE.Container.row.left.center({},{},
                        iconButton({
                            iconName:'cancel',
                            onClick: () => {
                                removeFilter(filterName)
                                setSortBy(sb.TIME_CREATED)
                                setSortDir(sd.ASC)
                            }
                        }),
                        RE.span({style:{paddingRight:'10px'}, onClick: () => setFocusedFilter(null)}, 'Sort by:')
                    ),
                    re(SortBySelector,{
                        possibleParams: possibleParams,
                        selectedParam: sortBy,
                        onParamSelected: newSortBy => setSortBy(newSortBy),
                        possibleDirs: possibleDirs,
                        selectedDir: sortDir,
                        onDirSelected: newSortDir => setSortDir(newSortDir),
                        minimized,
                    })
                ),
                renderMinimized: () => `Sort by: ${possibleParams[sortBy].displayName} ${possibleDirs[sortDir].displayName}`,
                getFilterValues: () => ({sortBy, sortDir})
            }
        }
    }

    const allFilterObjects = {
        ...createSearchInActiveFilterObject(),
        ...createTagsToIncludeFilterObject(),
        ...createTagsToExcludeFilterObject(),
        ...createCreatedOnOrAfterFilterObject(),
        ...createCreatedOnOrBeforeFilterObject(),
        ...createNativeTextLengthFilterObject(),
        ...createNativeTextContainsFilterObject(),
        ...createForeignTextLengthFilterObject(),
        ...createForeignTextContainsFilterObject(),
        ...createBecomesAccessibleOnOrAfterFilterObject(),
        ...createBecomesAccessibleOnOrBeforeFilterObject(),
        ...createSortByFilterObject(),
    }

    function renderSelectedFilters() {
        return RE.Container.col.top.left({style:{marginTop:'5px'}},{style:{marginTop:'5px'}},
            filtersSelected.map(filterName => RE.Paper({onClick: () => focusedFilter !== filterName ? setFocusedFilter(filterName) : null},
                allFilterObjects[filterName].render()
            ))
        )
    }

    function renderAvailableFilterListItem({filterName, filterDisplayName, resolve}) {
        return RE.If(!filtersSelected.includes(filterName), () => RE.Fragment({key:filterName},
            RE.ListItem(
                {key:filterName, button:true, onClick: () => resolve(filterName)},
                RE.ListItemText({}, filterDisplayName)
            ),
            RE.Divider({key:filterName+'-d'})
        ))
    }

    function renderListOfAvailableFilters(resolve) {
        let filterNames = hasValue(allowedFilters)
            ? allowedFilters
            : [
                af.INCLUDE_TAGS,
                af.EXCLUDE_TAGS,
                af.SEARCH_IN_ACTIVE,
                af.CREATED_ON_OR_AFTER,
                af.CREATED_ON_OR_BEFORE,
                af.NATIVE_TEXT_LENGTH,
                af.NATIVE_TEXT_CONTAINS,
                af.FOREIGN_TEXT_LENGTH,
                af.FOREIGN_TEXT_CONTAINS,
                af.BECOMES_ACCESSIBLE_ON_OR_AFTER,
                af.BECOMES_ACCESSIBLE_ON_OR_BEFORE,
                af.SORT_BY,
            ]
        return RE.List({},
            filterNames.map(filterName =>
                renderAvailableFilterListItem({filterName, filterDisplayName: allFilterObjects[filterName].displayName, resolve})
            )
        )
    }

    function renderAddFilterButton() {
        return iconButton({
            iconName: 'playlist_add',
            onClick: async () => {
                const selectedFilter = await showDialog({
                    title: 'Select filter:',
                    cancelBtnText: 'cancel',
                    contentRenderer: resolve => {
                        return renderListOfAvailableFilters(resolve)
                    }
                })
                if (hasValue(selectedFilter)) {
                    addFilter(selectedFilter)
                }
            }
        })
    }

    function getEffectiveSelectedFilterNames() {
        return filtersSelected
            .filter(filterName => (filterName !== af.INCLUDE_TAGS || tagsToInclude.length) && (filterName !== af.EXCLUDE_TAGS || tagsToExclude.length))
    }

    function getSelectedFilter() {
        return getEffectiveSelectedFilterNames()
            .map(filterName => allFilterObjects[filterName])
            .reduce((acc,elem) => ({...acc,...elem.getFilterValues()}), {})
    }

    function doSubmit() {
        onSubmit(getSelectedFilter())
    }

    function renderComponentContent() {
        if (errorLoadingCardToTagsMap) {
            return RE.Fragment({},
                `An error occurred during loading of card to tags mapping: [${errorLoadingCardToTagsMap.code}] - ${errorLoadingCardToTagsMap.msg}`,
            )
        } else if (hasNoValue(allTags) || hasNoValue(allTagsMap) || hasNoValue(cardToTagsMap)) {
            return 'Loading tags...'
        } else {
            return RE.Container.col.top.left({style:{marginTop:'5px'}},{style:{marginTop:'5px'}},
                RE.Container.row.left.center({},{},
                    renderAddFilterButton(),
                    iconButton({iconName:submitButtonIconName, onClick: doSubmit})
                ),
                renderSelectedFilters(),
            )
        }
    }

    if (minimized) {
        const filtersToRender = getEffectiveSelectedFilterNames().sortBy(n => CARD_FILTER_SORT_ORDER[n])
        return RE.Paper({style:{padding:'5px'}},
            filtersToRender.length ? RE.Container.col.top.left({},{},
                filtersToRender.map(filterName => allFilterObjects[filterName].renderMinimized())
            ) : 'All cards'
        )
    } else {
        return RE.Fragment({},
            renderComponentContent(),
            renderMessagePopup()
        )
    }
}

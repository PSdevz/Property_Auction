import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';
import Navbar from "../Navbar/Navbar";
import Footer from "../Footer/Footer";
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import useSessionGuard from "../hooks/useSessionGuard";
import EditBids from '../EditBids/EditBids';

const SellerDashboard = () => {
    useSessionGuard();
    const username = sessionStorage.getItem("username") || "Seller";
    const [properties, setProperties] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [activeSection, setActiveSection] = useState("ACTIVE");

    const [propertyData, setPropertyData] = useState({
        title: "",
        city: "",
        postcode: "",
        description: "",
        address: "",
        reservePrice: "",
        bedrooms: "",
        bathrooms: "",
        receptions: "",
        duration: 7,
        images: []
    });

    const fetchProperties = async () => {
        try {
            const response = await axios.get(`http://localhost:8080/api/properties/seller/${username}`);
            setProperties(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Error fetching properties:", error);
            setProperties([]);
        }
    };

    useEffect(() => {
        fetchProperties();
        const intervalId = setInterval(() => {
            fetchProperties();
        }, 3000);
        return () => clearInterval(intervalId);
    }, [username]);

    const checkHasActualBids = (auction) => {
        if (!auction) return false;
        if (auction.bidCount !== undefined && auction.bidCount > 0) return true;
        if (auction.highestBidder && auction.highestBidder !== "") return true;
        if (auction.bids && auction.bids.length > 0) return true;
        return false;
    };

    const activeProperties = properties.filter(p => p.listingStatus === "ACTIVE");
    const endedProperties = properties.filter(p =>
        p.listingStatus === "ENDED" || p.listingStatus === "SOLD" || p.listingStatus === "DEACTIVATED"
    );

    const activeCount = activeProperties.length;
    const endedCount = endedProperties.length;

    const totalSales = properties
        .filter(p => {
            const hasActualBids = checkHasActualBids(p.auction);
            return (p.listingStatus === "SOLD" || (p.listingStatus === "ENDED" && hasActualBids));
        })
        .reduce((sum, p) => sum + (p.auction?.currentHighestBid || p.auction?.currentPrice || 0), 0);

    // ══════════ STRICT MUTUALLY EXCLUSIVE COUNTS (FIXED) ══════════
    const deactivatedCount = properties.filter(p => p.listingStatus === "DEACTIVATED").length;

    const noBidsCount = properties.filter(p => {
        const hasActualBids = checkHasActualBids(p.auction);
        const auctionStatus = p.auction?.status || '';
        return p.listingStatus !== "DEACTIVATED" && (auctionStatus === 'NO_BIDS' || !hasActualBids) && p.listingStatus !== "ACTIVE";
    }).length;

    const paymentFailedCount = properties.filter(p => {
        const hasActualBids = checkHasActualBids(p.auction);
        const auctionStatus = p.auction?.status || '';
        return p.listingStatus !== "DEACTIVATED" && hasActualBids && auctionStatus === 'FAILED_PAYMENT';
    }).length;

    // NEW: Only count as Pending if they haven't paid yet
    const pendingPaymentCount = properties.filter(p => {
        const hasActualBids = checkHasActualBids(p.auction);
        const auctionStatus = p.auction?.status || '';
        return p.listingStatus === "ENDED" && hasActualBids && auctionStatus !== 'FAILED_PAYMENT' && auctionStatus !== 'NO_BIDS';
    }).length;

    // FIX: Only count as SOLD if the backend explicitly marked it as SOLD (Payment completed)
    const soldCount = properties.filter(p => p.listingStatus === "SOLD" || p.auction?.status === "SOLD").length;

    // ══════════ STRICT FILTER LOGIC ══════════
    const getFilteredEndedProperties = () => {
        return endedProperties.filter(property => {
            const hasActualBids = checkHasActualBids(property.auction);
            const auctionStatus = property.auction?.status || '';

            const isDeactivated = property.listingStatus === 'DEACTIVATED';
            const isNoBids = !isDeactivated && (auctionStatus === 'NO_BIDS' || !hasActualBids);
            const isPaymentFailed = !isDeactivated && !isNoBids && auctionStatus === 'FAILED_PAYMENT';
            const isSold = property.listingStatus === 'SOLD' || auctionStatus === 'SOLD';
            const isPendingPayment = !isDeactivated && !isNoBids && !isPaymentFailed && !isSold && property.listingStatus === 'ENDED';

            if (activeSection === "ENDED_ALL") return true;
            if (activeSection === "ENDED_SOLD") return isSold;
            if (activeSection === "ENDED_PENDING") return isPendingPayment;
            if (activeSection === "ENDED_NOBIDS") return isNoBids;
            if (activeSection === "ENDED_PAYMENT") return isPaymentFailed;
            if (activeSection === "ENDED_CANCELLED") return isDeactivated;

            return true;
        });
    };

    const statusData = [
        { name: 'Active', value: activeCount },
        { name: 'Sold', value: soldCount },
        { name: 'Pending Payment', value: pendingPaymentCount },
        { name: 'No Bids', value: noBidsCount },
        { name: 'Payment Failed', value: paymentFailedCount },
        { name: 'Cancelled', value: deactivatedCount },
    ].filter(d => d.value > 0);

    const STATUS_COLORS = {
        'Active': '#059669',
        'Sold': '#1e1e2d',
        'Pending Payment': '#0284c7', // Blue color for pending
        'No Bids': '#f59e0b',
        'Payment Failed': '#ef4444',
        'Cancelled': '#8e8ea0',
    };

    const bidData = properties
        .filter(p => checkHasActualBids(p.auction))
        .map(p => ({
            name: p.title.length > 18 ? p.title.substring(0, 18) + '…' : p.title,
            bid: p.auction?.currentHighestBid || p.auction?.currentPrice || 0,
            reserve: p.reservePrice,
        }))
        .sort((a, b) => b.bid - a.bid)
        .slice(0, 6);

    const currentEditProperty = editingId ? properties.find(p => p.id === editingId) : null;
    const hasBids = checkHasActualBids(currentEditProperty?.auction);


    //handleImageUpload function converts uploaded images into Base64 strings and stores them inside React state
    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const currentImages = propertyData.images || [];

        if (currentImages.length + files.length > 5) {
            alert("You can only upload a maximum of 5 images.");
            return;
        }

        //create promises
        const base64Promises = files.map(file => {
            return new Promise((resolve, reject) => {
                if (file.size > 20 * 1024 * 1024) {
                    alert(`Image ${file.name} is too large. Please select images under 20MB.`);
                    reject();
                } else {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                }
            });
        });

        //translate each into base64

        try {
            const newBase64Images = await Promise.all(base64Promises);
            setPropertyData(prev => ({
                ...prev,
                //transform each image into base64(if exists)
                images: [...(prev.images || []), ...newBase64Images].slice(0, 5)
            }));
        } catch (err) {
            console.error("Error processing images", err);
        }
    };

    const removeImage = (indexToRemove) => {
        setPropertyData(prev => ({
            ...prev,
            images: prev.images.filter((_, idx) => idx !== indexToRemove)
        }));
    };

    const handleEditClick = (property) => {
        setEditingId(property.id);

        const loadedImages = property.images && property.images.length > 0
            ? property.images /**The property was created before adding the multiple-image feature.
 The images list is empty (Length = 0), but it has a mainImage.**/
            : (property.mainImage ? [property.mainImage] : []);

        setPropertyData({
            title: property.title || "",
            city: property.city || "",
            postcode: property.postcode || "",
            description: property.description || "",
            address: property.address || "",
            reservePrice: property.reservePrice ? property.reservePrice.toString() : "",
            bedrooms: property.bedrooms || "",
            bathrooms: property.bathrooms || "",
            receptions: property.receptions || "",
            duration: property.duration || 7,
            images: loadedImages
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };


    //USE ASYNC TO ALLOW THE FUNCTION TO WORK IN THE BACKGROUND
    //NO NEED FO RTHE APP TO WAIT

    const handleSubmit = async (e) => {
        e.preventDefault();

        const sanitizedPrice = propertyData.reservePrice.toString().replace(/,/g, '');

        const payload = {
            ...propertyData,
            reservePrice: parseFloat(sanitizedPrice),
            sellerUsername: username,
            city: propertyData.city,
            postcode: propertyData.postcode,
            mainImage: propertyData.images[0] || "",
            images: propertyData.images,
            startDate: editingId ? undefined : new Date().toISOString()
        };

        try {
            if (editingId) {
                await axios.put(`http://localhost:8080/api/properties/${editingId}`, payload);
                alert("Property Updated Successfully!");
            } else {
                await axios.post('http://localhost:8080/api/properties/add', payload);
                alert("Property Listed Successfully!");
            }
            resetForm();
            fetchProperties();
        } catch (error) {
            alert(error.response?.data || "Failed to save property.");
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setPropertyData({
            title: "",
            city: "",
            postcode: "",
            description: "",
            address: "",
            reservePrice: "",
            bedrooms: "",
            bathrooms: "",
            receptions: "",
            duration: 7,
            images: []
        });
    };

    const CustomBarTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{ background: 'white', border: '1px solid #ebebf0', borderRadius: 10, padding: '12px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: '0.82rem' }}>
                <p style={{ fontWeight: 700, color: '#1e1e2d', marginBottom: 6 }}>{payload[0]?.payload?.name}</p>
                {payload.map((entry, i) => (
                    <p key={i} style={{ color: entry.color, margin: '2px 0', fontWeight: 600 }}>{entry.name}: £{entry.value.toLocaleString()}</p>
                ))}
            </div>
        );
    };

    const handleIntegerKeyDown = (e) => {
        if (['e', 'E', '+', '-', '.'].includes(e.key)) {
            e.preventDefault();
        }
    };

    return (
        <div className="dashboard-page-wrapper">
            <Navbar />
            <div className="container-main">

                <div className="buyer-header">
                    <h1>Welcome back, {username}</h1>
                    <p>Manage your property listings and track auction performance.</p>
                </div>

                <div className="stats-grid">
                    <div className="stat-card"><h3>{activeCount}</h3><p>Active Listings</p></div>
                    <div className="stat-card"><h3>{endedCount}</h3><p>Completed / Cancelled</p></div>
                    <div className="stat-card"><h3>{properties.length}</h3><p>Total Listings</p></div>
                    <div className="stat-card"><h3>£{totalSales.toLocaleString()}</h3><p>Total Sales Value</p></div>
                </div>

                {properties.length > 0 && (
                    <div className="charts-container" style={{
                        display: 'grid',
                        gridTemplateColumns: statusData.length > 0 && bidData.length > 0 ? '1fr 2fr' : '1fr',
                        gap: 20,
                        marginBottom: 32
                    }}>
                        {statusData.length > 0 && (
                            <div style={{
                                background: 'white',
                                border: '1px solid #ebebf0',
                                borderRadius: 16,
                                padding: '24px 20px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)'
                            }}>
                                <h3 style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    color: '#1e1e2d',
                                    marginBottom: 16,
                                    paddingBottom: 12,
                                    borderBottom: '1px solid #f0f0f5'
                                }}>Listing Status</h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                                             paddingAngle={3} dataKey="value" stroke="none">
                                            {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name]}/>)}
                                        </Pie>
                                        <Tooltip/>
                                        <Legend verticalAlign="bottom" iconType="circle" iconSize={8}
                                                formatter={(value) => <span style={{fontSize: '0.75rem', color: '#555', fontWeight: 600}}>{value}</span>}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {bidData.length > 0 && (
                            <div style={{
                                background: 'white',
                                border: '1px solid #ebebf0',
                                borderRadius: 16,
                                padding: '24px 20px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)'
                            }}>
                                <h3 style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    color: '#1e1e2d',
                                    marginBottom: 16,
                                    paddingBottom: 12,
                                    borderBottom: '1px solid #f0f0f5'
                                }}>Highest Bid vs Reserve Price</h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={bidData} barCategoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" vertical={false}/>
                                        <XAxis dataKey="name" tick={{fontSize: 11, fill: '#8e8ea0', fontWeight: 600}} axisLine={{stroke: '#ebebf0'}} tickLine={false}/>
                                        <YAxis tick={{fontSize: 11, fill: '#8e8ea0', fontWeight: 600}} axisLine={false} tickLine={false} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}/>
                                        <Tooltip content={<CustomBarTooltip/>}/>
                                        <Bar dataKey="reserve" name="Reserve/Starting" fill="#e0e0e8" radius={[4, 4, 0, 0]}/>
                                        <Bar dataKey="bid" name="Highest Bid" fill="#1e1e2d" radius={[4, 4, 0, 0]}/>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}

                {showForm ? (
                    <div className="property-card" style={{marginBottom: 32, padding: '32px 28px'}}>
                        <h3 style={{paddingRight: 0, marginBottom: 20}}>{editingId ? 'Edit Property' : 'List New Property'}</h3>
                        <form onSubmit={handleSubmit}>

                            <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: 14, alignItems: 'flex-start', marginBottom: 14}}>
                                <div>
                                    <label style={labelStyle}>Property Title *</label>
                                    <input type="text" required placeholder="e.g. 3 Bed Semi-Detached" disabled={hasBids}
                                           value={propertyData.title} onChange={(e) => setPropertyData({...propertyData, title: e.target.value})}
                                           style={{...inputStyle, ...(hasBids ? lockedStyle : {})}}/>
                                </div>
                                <div>
                                    <label style={labelStyle}>City *</label>
                                    <input type="text" required placeholder="e.g. London" disabled={hasBids}
                                           value={propertyData.city}
                                           onChange={(e) => {
                                               const sanitizedCity = e.target.value.replace(/[^a-zA-Z\s\-']/g, '');
                                               setPropertyData({...propertyData, city: sanitizedCity});
                                           }}
                                           style={{...inputStyle, ...(hasBids ? lockedStyle : {})}}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Postcode *</label>
                                    <input type="text" required placeholder="e.g. SW1A 1AA" disabled={hasBids}
                                           value={propertyData.postcode} onChange={(e) => setPropertyData({...propertyData, postcode: e.target.value})}
                                           style={{...inputStyle, ...(hasBids ? lockedStyle : {})}}/>
                                </div>
                            </div>

                            <div style={{marginBottom: 14}}>
                                <label style={labelStyle}>Full Address *</label>
                                <input type="text" required placeholder="e.g. 42 High Street, London" disabled={hasBids}
                                       value={propertyData.address} onChange={(e) => setPropertyData({...propertyData, address: e.target.value})}
                                       style={{...inputStyle, ...(hasBids ? lockedStyle : {})}}/>
                            </div>

                            <div style={{marginBottom: 14}}>
                                <label style={labelStyle}>Description *</label>
                                <textarea required rows={3} placeholder="Describe the property..."
                                          value={propertyData.description} onChange={(e) => setPropertyData({...propertyData, description: e.target.value})}
                                          style={{...inputStyle, height: 'auto', resize: 'vertical', minHeight: 80}}/>
                            </div>

                            <div style={{marginBottom: 14}}>
                                <label style={labelStyle}>Property Images (Max 5)</label>
                                <input type="file" multiple accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload}
                                       disabled={hasBids || propertyData.images.length >= 5}
                                       style={{...inputStyle, padding: '9px 14px', ...(hasBids || propertyData.images.length >= 5 ? lockedStyle : {})}}/>
                                {propertyData.images.length > 0 && (
                                    <div style={{display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap'}}>
                                        {propertyData.images.map((imgSrc, index) => (
                                            <div key={index} style={{position: 'relative'}}>
                                                <img src={imgSrc} alt={`Upload ${index + 1}`} style={{height: '90px', width: '130px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e0e0e8'}}/>
                                                {!hasBids && (
                                                    <button type="button" onClick={() => removeImage(index)}
                                                            style={{
                                                                position: 'absolute', top: '-6px', right: '-6px', background: '#dc2626', color: 'white',
                                                                border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer',
                                                                fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                            }}>✕</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'flex-start', marginBottom: 20}}>
                                <div>
                                    <label style={labelStyle}>Auction Duration *</label>
                                    <select value={propertyData.duration} disabled={hasBids}
                                            onChange={(e) => setPropertyData({...propertyData, duration: parseInt(e.target.value)})}
                                            style={{...inputStyle, ...(hasBids ? lockedStyle : {})}}>
                                        <option value={0} style={{color: '#dc2626', fontWeight: 'bold'}}>1 Minute (TESTING)</option>
                                        <option value={3}>3 Days</option>
                                        <option value={7}>7 Days</option>
                                        <option value={14}>14 Days</option>
                                        <option value={21}>21 Days</option>
                                        <option value={30}>30 Days</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Reserve / Starting Price (£) *</label>
                                    <input type="number" min="0" step="0.01" required disabled={hasBids}
                                           value={propertyData.reservePrice}
                                           onChange={(e) => setPropertyData({...propertyData, reservePrice: e.target.value})}
                                           style={{...inputStyle, ...(hasBids ? lockedStyle : {})}}
                                    />
                                </div>
                            </div>

                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, alignItems: 'flex-start', marginBottom: hasBids ? 14 : 24}}>
                                <div>
                                    <label style={labelStyle}>Bedrooms</label>
                                    <input type="number" min="0" step="1" onKeyDown={handleIntegerKeyDown} disabled={hasBids}
                                           value={propertyData.bedrooms} onChange={(e) => setPropertyData({...propertyData, bedrooms: e.target.value})}
                                           style={{...inputStyle, ...(hasBids ? lockedStyle : {})}} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Bathrooms</label>
                                    <input type="number" min="0" step="1" onKeyDown={handleIntegerKeyDown} disabled={hasBids}
                                           value={propertyData.bathrooms} onChange={(e) => setPropertyData({...propertyData, bathrooms: e.target.value})}
                                           style={{...inputStyle, ...(hasBids ? lockedStyle : {})}} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Receptions</label>
                                    <input type="number" min="0" step="1" onKeyDown={handleIntegerKeyDown} disabled={hasBids}
                                           value={propertyData.receptions} onChange={(e) => setPropertyData({...propertyData, receptions: e.target.value})}
                                           style={{...inputStyle, ...(hasBids ? lockedStyle : {})}} />
                                </div>
                            </div>

                            {hasBids && (
                                <div style={{marginBottom: 24}}>
                                    <EditBids property={currentEditProperty}/>
                                </div>
                            )}

                            <div style={{display: 'flex', gap: 10}}>
                                <button type="submit" className="action-btn" style={{flex: 1}}>{editingId ? 'Update Property' : 'List Property'}</button>
                                <button type="button" className="btn-edit" onClick={resetForm} style={{padding: '12px 24px'}}>Cancel</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div style={{marginBottom: 24}}>
                        <button className="action-btn" onClick={() => {
                            setEditingId(null);
                            setShowForm(true);
                        }}>+ List New Property
                        </button>
                    </div>
                )}

                <div className="dashboard-tabs" style={{marginBottom: 20}}>
                    <button className={activeSection === "ACTIVE" ? "tab active" : "tab"} onClick={() => setActiveSection("ACTIVE")}>
                        Active Listings ({activeProperties.length})
                    </button>
                    <button className={activeSection.startsWith("ENDED") ? "tab active" : "tab"} onClick={() => setActiveSection("ENDED_ALL")}>
                        Completed / Cancelled ({endedProperties.length})
                    </button>
                </div>

                {activeSection === "ACTIVE" && (
                    <div className="activity-table-wrapper" style={{overflow: 'auto', maxHeight: 'none'}}>
                        <table className="activity-table">
                            <thead>
                            <tr>
                                <th>Property</th>
                                <th>Date Added</th>
                                <th>Reserve Price</th>
                                <th>Current Bid</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {activeProperties.length === 0 ? (<tr><td colSpan="6" style={{textAlign: 'center', padding: '40px 20px', color: '#8e8ea0'}}>No active listings. Create one above.</td></tr>) : (
                                activeProperties.map((property) => {
                                    const hasActualBids = checkHasActualBids(property.auction);
                                    const bidDisplay = hasActualBids ? (property.auction?.currentHighestBid || property.auction?.currentPrice || 0) : 0;
                                    const reserve = property.reservePrice || 0;
                                    return (
                                        <tr key={property.id}>
                                            <td>{property.title}</td>
                                            <td>{new Date(property.startDate).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})}</td>
                                            <td style={{fontWeight: 700}}>£{Number(reserve).toLocaleString()}</td>
                                            <td><span style={{fontWeight: 700, color: !hasActualBids ? '#8e8ea0' : '#059669'}}>£{bidDisplay.toLocaleString()}</span></td>
                                            <td><span className={`status-pill status-active`}>{property.listingStatus}</span></td>
                                            <td><button className="btn-edit" onClick={() => handleEditClick(property)}>Edit</button></td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeSection.startsWith("ENDED") && (
                    <>
                        <div style={{marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap'}}>
                            <button onClick={() => setActiveSection("ENDED_ALL")} style={filterBtnStyle(activeSection === "ENDED_ALL", '#1e1e2d')}>
                                All ({endedProperties.length})
                            </button>
                            <button onClick={() => setActiveSection("ENDED_SOLD")} style={filterBtnStyle(activeSection === "ENDED_SOLD", '#059669')}>
                                Sold ({soldCount})
                            </button>
                            <button onClick={() => setActiveSection("ENDED_PENDING")} style={filterBtnStyle(activeSection === "ENDED_PENDING", '#0284c7')}>
                                Pending Payment ({pendingPaymentCount})
                            </button>
                            <button onClick={() => setActiveSection("ENDED_NOBIDS")} style={filterBtnStyle(activeSection === "ENDED_NOBIDS", '#f59e0b')}>
                                No Bids ({noBidsCount})
                            </button>
                            <button onClick={() => setActiveSection("ENDED_PAYMENT")} style={filterBtnStyle(activeSection === "ENDED_PAYMENT", '#ef4444')}>
                                Payment Failed ({paymentFailedCount})
                            </button>
                            <button onClick={() => setActiveSection("ENDED_CANCELLED")} style={filterBtnStyle(activeSection === "ENDED_CANCELLED", '#8e8ea0')}>
                                Cancelled ({deactivatedCount})
                            </button>
                        </div>

                        <div className="activity-table-wrapper" style={{overflow: 'auto', maxHeight: 'none'}}>
                            <table className="activity-table">
                                <thead>
                                <tr>
                                    <th>Property</th>
                                    <th>Date Added</th>
                                    <th>Reserve Price</th>
                                    <th>Final Price</th>
                                    <th>Result</th>
                                </tr>
                                </thead>
                                <tbody>
                                {getFilteredEndedProperties().length === 0 ? (
                                    <tr><td colSpan="5" style={{textAlign: 'center', padding: '40px 20px', color: '#8e8ea0'}}>No properties found.</td></tr>
                                ) : (
                                    getFilteredEndedProperties().map((property) => {
                                        const hasActualBids = checkHasActualBids(property.auction);
                                        const bidDisplay = hasActualBids ? (property.auction?.currentHighestBid || property.auction?.currentPrice || 0) : 0;
                                        const reserve = property.reservePrice || 0;
                                        const auctionStatus = property.auction?.status || '';

                                        // ══════════ STRICT TABLE RENDERER HIERARCHY ══════════
                                        const isDeactivated = property.listingStatus === 'DEACTIVATED';
                                        const isNoBids = !isDeactivated && (auctionStatus === 'NO_BIDS' || !hasActualBids);
                                        const isPaymentFailed = !isDeactivated && !isNoBids && auctionStatus === 'FAILED_PAYMENT';
                                        const isSold = property.listingStatus === 'SOLD' || auctionStatus === 'SOLD';
                                        const isPendingPayment = !isDeactivated && !isNoBids && !isPaymentFailed && !isSold && property.listingStatus === 'ENDED';

                                        let resultLabel = '';
                                        let resultBg = '';
                                        let resultColor = '';
                                        let resultBorder = '';

                                        if (isDeactivated) {
                                            resultLabel = 'CANCELLED'; resultBg = '#f3f4f6'; resultColor = '#6b7280'; resultBorder = '1px solid #d1d5db';
                                        } else if (isNoBids) {
                                            resultLabel = 'NO BIDS'; resultBg = '#fef3c7'; resultColor = '#92400e'; resultBorder = '1px solid #fde68a';
                                        } else if (isPaymentFailed) {
                                            resultLabel = 'PAYMENT FAILED'; resultBg = '#fef2f2'; resultColor = '#991b1b'; resultBorder = '1px solid #fecaca';
                                        } else if (isPendingPayment) {
                                            resultLabel = 'PENDING PAYMENT'; resultBg = '#e0f2fe'; resultColor = '#0369a1'; resultBorder = '1px solid #bae6fd';
                                        } else if (isSold) {
                                            resultLabel = 'SOLD'; resultBg = '#ecfdf5'; resultColor = '#065f46'; resultBorder = '1px solid #a7f3d0';
                                        }

                                        return (
                                            <tr key={property.id}>
                                                <td>{property.title}</td>
                                                <td>{new Date(property.startDate).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})}</td>
                                                <td style={{fontWeight: 700}}>£{Number(reserve).toLocaleString()}</td>
                                                <td><span style={{fontWeight: 700}}>{isDeactivated || isNoBids ? '£0' : `£${bidDisplay.toLocaleString()}`}</span></td>
                                                <td>
                                                    <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 24, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', background: resultBg, color: resultColor, border: resultBorder }}>
                                                        {resultLabel}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
            <Footer/>
        </div>
    );
};

const filterBtnStyle = (isActive, activeColor) => ({
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    background: isActive ? activeColor : '#f0f0f5',
    color: isActive ? 'white' : '#555',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
    transition: 'all 0.2s'
});

const labelStyle = {fontSize: '0.82rem', fontWeight: 600, color: '#555', marginBottom: 4, display: 'block'};
const inputStyle = { width: '100%', height: '48px', padding: '12px 14px', border: '2px solid #e0e0e8', borderRadius: 10, fontSize: '0.92rem', fontWeight: 500, color: '#1e1e2d', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', backgroundColor: 'white', transition: 'border-color 0.2s', margin: 0 };
const lockedStyle = { backgroundColor: '#f7f7f9', color: '#a0a0b0', cursor: 'not-allowed', borderColor: '#ebebf0', opacity: 1 };

export default SellerDashboard;